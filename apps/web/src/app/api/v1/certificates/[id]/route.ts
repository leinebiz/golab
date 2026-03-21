import { NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requirePermission } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

/**
 * GET /api/v1/certificates/:id
 * Get certificate detail with full sub-request context for the review interface.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('certificates', 'review');
    const userId = session.user!.id;
    const { id } = await params;

    const certificate = await prisma.certificate.findUnique({
      where: { id },
      include: {
        subRequest: {
          include: {
            request: {
              include: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                    registrationNumber: true,
                    industry: true,
                  },
                },
              },
            },
            laboratory: {
              select: {
                id: true,
                name: true,
                code: true,
                contactEmail: true,
              },
            },
            tests: {
              include: {
                testCatalogue: {
                  select: {
                    code: true,
                    name: true,
                    category: true,
                    accreditation: true,
                  },
                },
                tolerances: true,
              },
            },
            statusTransitions: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    const { subRequest } = certificate;

    logger.info({ userId, certificateId: id }, 'certificate.detail.viewed');

    return NextResponse.json({
      certificate: {
        id: certificate.id,
        format: certificate.format,
        version: certificate.version,
        fileName: certificate.fileName,
        mimeType: certificate.mimeType,
        originalFileKey: certificate.originalFileKey,
        golabFileKey: certificate.golabFileKey,
        isValidated: certificate.isValidated,
        validationErrors: certificate.validationErrors,
        validatedAt: certificate.validatedAt,
        reviewAction: certificate.reviewAction,
        reviewedById: certificate.reviewedById,
        reviewedAt: certificate.reviewedAt,
        reviewNotes: certificate.reviewNotes,
        releasedAt: certificate.releasedAt,
        createdAt: certificate.createdAt,
      },
      subRequest: {
        id: subRequest.id,
        subReference: subRequest.subReference,
        status: subRequest.status,
        labAcceptedAt: subRequest.labAcceptedAt,
        testingStartedAt: subRequest.testingStartedAt,
        testingCompletedAt: subRequest.testingCompletedAt,
      },
      request: {
        id: subRequest.request.id,
        reference: subRequest.request.reference,
        status: subRequest.request.status,
        turnaroundType: subRequest.request.turnaroundType,
        specialInstructions: subRequest.request.specialInstructions,
        createdAt: subRequest.request.createdAt,
      },
      customer: subRequest.request.organization,
      laboratory: subRequest.laboratory,
      tests: subRequest.tests.map((t) => ({
        id: t.id,
        code: t.testCatalogue.code,
        name: t.testCatalogue.name,
        category: t.testCatalogue.category,
        accreditation: t.testCatalogue.accreditation,
        sampleCount: t.sampleCount,
        accreditationRequired: t.accreditationRequired,
        tolerances: t.tolerances.map((tol) => ({
          minValue: tol.minValue?.toString() ?? null,
          maxValue: tol.maxValue?.toString() ?? null,
          unit: tol.unit,
          notes: tol.notes,
        })),
      })),
      history: subRequest.statusTransitions.map((st) => ({
        from: st.fromStatus,
        to: st.toStatus,
        reason: st.reason,
        createdAt: st.createdAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Forbidden') {
      return NextResponse.json(
        { error: message },
        { status: message === 'Unauthorized' ? 401 : 403 },
      );
    }
    logger.error({ error }, 'certificate.detail.error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
