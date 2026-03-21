import { prisma } from '@golab/database';
import { executeTransition } from './engine';
import { logger } from '../observability/logger';

interface ReleaseContext {
  subRequestId: string;
  certificateId: string;
  reviewerId: string;
  reviewerRole: string;
}

/**
 * Release a certificate to the customer.
 *
 * 1. Transition sub-request to RELEASED_TO_CUSTOMER
 * 2. Check if all sub-requests of the parent request are released
 * 3. If so, transition the parent request to CLOSED
 * 4. Return notification trigger data (actual sending is Unit 10)
 */
export async function releaseCertificate(ctx: ReleaseContext) {
  const { subRequestId, certificateId, reviewerId, reviewerRole } = ctx;

  // Mark certificate as released
  await prisma.certificate.update({
    where: { id: certificateId },
    data: { releasedAt: new Date() },
  });

  // Transition sub-request: APPROVED_FOR_RELEASE -> RELEASED_TO_CUSTOMER
  await executeTransition({
    entityType: 'SubRequest',
    entityId: subRequestId,
    targetStatus: 'RELEASED_TO_CUSTOMER',
    triggeredBy: {
      userId: reviewerId,
      role: reviewerRole,
      type: 'system',
    },
    reason: 'Certificate approved and released',
  });

  // Check if all sibling sub-requests are released
  const subRequest = await prisma.subRequest.findUniqueOrThrow({
    where: { id: subRequestId },
    include: {
      request: {
        include: {
          subRequests: { select: { id: true, status: true } },
        },
      },
    },
  });

  const allReleased = subRequest.request.subRequests.every(
    (sr) => sr.status === 'RELEASED_TO_CUSTOMER',
  );

  let requestCompleted = false;

  if (allReleased) {
    await executeTransition({
      entityType: 'Request',
      entityId: subRequest.requestId,
      targetStatus: 'CLOSED',
      triggeredBy: {
        userId: reviewerId,
        role: 'SYSTEM',
        type: 'system',
      },
      reason: 'All sub-requests released to customer',
      metadata: { closedAt: new Date().toISOString() },
    });
    requestCompleted = true;
  }

  logger.info(
    {
      subRequestId,
      certificateId,
      requestId: subRequest.requestId,
      requestCompleted,
    },
    'certificate.released',
  );

  // Notification trigger point -- Unit 10 will consume this
  return {
    type: 'CERTIFICATE_RELEASED' as const,
    subRequestId,
    certificateId,
    requestId: subRequest.requestId,
    requestCompleted,
    customerId: subRequest.request.organizationId,
  };
}

/**
 * GoLab-branded certificate data structure.
 * Actual PDF generation is Unit 14 -- this creates the data envelope.
 */
export interface GoLabBrandedCertificateData {
  golabReference: string;
  originalCertificateId: string;
  subRequestReference: string;
  requestReference: string;
  labName: string;
  labCode: string;
  customerName: string;
  tests: Array<{
    testCode: string;
    testName: string;
    accreditation: string;
  }>;
  replicatedAt: string;
  replicatedById: string;
}

/**
 * Prepare the data structure for a GoLab-branded replicated certificate.
 * The actual PDF rendering is handled by Unit 14 (pdf-templates package).
 */
export async function prepareGoLabBrandedCertificate(
  certificateId: string,
  replicatedById: string,
): Promise<GoLabBrandedCertificateData> {
  const certificate = await prisma.certificate.findUniqueOrThrow({
    where: { id: certificateId },
    include: {
      subRequest: {
        include: {
          request: {
            include: { organization: true },
          },
          laboratory: true,
          tests: {
            include: { testCatalogue: true },
          },
        },
      },
    },
  });

  const { subRequest } = certificate;

  const data: GoLabBrandedCertificateData = {
    golabReference: `GL-${subRequest.request.reference}-${Date.now()}`,
    originalCertificateId: certificateId,
    subRequestReference: subRequest.subReference,
    requestReference: subRequest.request.reference,
    labName: subRequest.laboratory.name,
    labCode: subRequest.laboratory.code,
    customerName: subRequest.request.organization.name,
    tests: subRequest.tests.map((t) => ({
      testCode: t.testCatalogue.code,
      testName: t.testCatalogue.name,
      accreditation: t.testCatalogue.accreditation,
    })),
    replicatedAt: new Date().toISOString(),
    replicatedById,
  };

  // Create a new certificate record for the GoLab-branded version
  await prisma.certificate.create({
    data: {
      subRequestId: subRequest.id,
      uploadedById: replicatedById,
      format: 'GOLAB_BRANDED',
      version: certificate.version + 1,
      originalFileKey: certificate.originalFileKey,
      golabFileKey: null, // Will be set when PDF is generated (Unit 14)
      fileName: `GoLab_${subRequest.subReference}_certificate.pdf`,
      mimeType: 'application/pdf',
      reviewAction: 'REPLICATED_TO_GOLAB_FORMAT',
      reviewedById: replicatedById,
      reviewedAt: new Date(),
      reviewNotes: 'Replicated to GoLab branded format',
    },
  });

  logger.info(
    {
      originalCertificateId: certificateId,
      golabReference: data.golabReference,
      subRequestId: subRequest.id,
    },
    'certificate.golab_branded.prepared',
  );

  return data;
}

/**
 * Create a retest sub-request from an existing one.
 * Links to the original via metadata.
 */
export async function createRetestSubRequest(
  originalSubRequestId: string,
  triggeredById: string,
  newLabId?: string,
): Promise<string> {
  const original = await prisma.subRequest.findUniqueOrThrow({
    where: { id: originalSubRequestId },
    include: {
      request: true,
      tests: {
        include: {
          tolerances: true,
        },
      },
    },
  });

  const labId = newLabId ?? original.laboratoryId;

  // Generate a new sub-reference
  const existingCount = await prisma.subRequest.count({
    where: { requestId: original.requestId },
  });
  const subReference = `${original.request.reference}-SR${String(existingCount + 1).padStart(2, '0')}`;

  const newSubRequest = await prisma.subRequest.create({
    data: {
      subReference,
      requestId: original.requestId,
      laboratoryId: labId,
      status: 'PICKUP_REQUESTED',
      tests: {
        create: original.tests.map((t) => ({
          testCatalogueId: t.testCatalogueId,
          sampleCount: t.sampleCount,
          accreditationRequired: t.accreditationRequired,
          unitPrice: t.unitPrice,
          totalPrice: t.totalPrice,
          tolerances: {
            create: t.tolerances.map((tol) => ({
              minValue: tol.minValue,
              maxValue: tol.maxValue,
              unit: tol.unit,
              notes: tol.notes
                ? `Retest of ${original.subReference}: ${tol.notes}`
                : `Retest of ${original.subReference}`,
              overridesDefault: tol.overridesDefault,
            })),
          },
        })),
      },
    },
  });

  // Record the transition
  await prisma.statusTransition.create({
    data: {
      subRequestId: newSubRequest.id,
      fromStatus: 'NEW',
      toStatus: 'PICKUP_REQUESTED',
      triggeredBy: triggeredById,
      reason: `Retest of ${original.subReference}`,
      metadata: {
        retestOf: originalSubRequestId,
        originalSubReference: original.subReference,
      },
    },
  });

  // Ensure the parent request is still IN_PROGRESS
  if (original.request.status === 'PENDING_CUSTOMER_ACTION') {
    await executeTransition({
      entityType: 'Request',
      entityId: original.requestId,
      targetStatus: 'IN_PROGRESS',
      triggeredBy: {
        userId: triggeredById,
        role: 'GOLAB_ADMIN',
        type: 'user',
      },
      reason: `Retest initiated for ${original.subReference}`,
    });
  }

  logger.info(
    {
      originalSubRequestId,
      newSubRequestId: newSubRequest.id,
      newSubReference: subReference,
      labId,
    },
    'subrequest.retest.created',
  );

  return newSubRequest.id;
}
