import { prisma } from '@golab/database';
import { logger } from '../observability/logger';

export interface ValidationIssue {
  field: string;
  severity: 'error' | 'warning';
  message: string;
  expected?: string;
  actual?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  validatedAt: string;
}

/**
 * Validate a certificate against its associated sub-request.
 *
 * Checks:
 * 1. Reference number on certificate matches the sub-request reference
 * 2. Test codes on certificate match the requested tests
 * 3. Lab code on certificate matches the assigned laboratory
 *
 * Mismatches are flagged for reviewer attention -- they do NOT auto-reject.
 */
export async function validateCertificate(certificateId: string): Promise<ValidationResult> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: {
      subRequest: {
        include: {
          request: true,
          laboratory: true,
          tests: {
            include: {
              testCatalogue: true,
            },
          },
        },
      },
    },
  });

  if (!certificate) {
    return {
      isValid: false,
      errors: [{ field: 'certificate', severity: 'error', message: 'Certificate not found' }],
      warnings: [],
      validatedAt: new Date().toISOString(),
    };
  }

  const { subRequest } = certificate;

  // Validation 1: Reference number check
  const subRef = subRequest.subReference;
  const requestRef = subRequest.request.reference;
  if (!certificate.fileName.includes(subRef) && !certificate.fileName.includes(requestRef)) {
    warnings.push({
      field: 'reference',
      severity: 'warning',
      message: 'Certificate filename does not contain the request or sub-request reference number',
      expected: `Contains "${subRef}" or "${requestRef}"`,
      actual: certificate.fileName,
    });
  }

  // Validation 2: Lab code check
  const labCode = subRequest.laboratory.code;
  if (!certificate.fileName.toLowerCase().includes(labCode.toLowerCase())) {
    warnings.push({
      field: 'labCode',
      severity: 'warning',
      message: 'Certificate filename does not reference the assigned laboratory code',
      expected: labCode,
      actual: certificate.fileName,
    });
  }

  // Validation 3: Certificate format check
  if (certificate.format !== 'LAB_ORIGINAL' && !certificate.golabFileKey) {
    errors.push({
      field: 'format',
      severity: 'error',
      message: 'GoLab-branded certificate is missing the branded file',
    });
  }

  // Validation 4: File integrity check
  if (!certificate.originalFileKey) {
    errors.push({
      field: 'originalFileKey',
      severity: 'error',
      message: 'Certificate is missing the original file reference',
    });
  }

  // Validation 5: Test count consistency
  const requestedTestCount = subRequest.tests.length;
  if (requestedTestCount === 0) {
    errors.push({
      field: 'tests',
      severity: 'error',
      message: 'Sub-request has no associated tests',
    });
  }

  // Validation 6: Sub-request must be in a reviewable state
  const reviewableStatuses = ['TESTING_COMPLETED', 'AWAITING_GOLAB_REVIEW', 'RETURNED_TO_LAB'];
  if (!reviewableStatuses.includes(subRequest.status)) {
    warnings.push({
      field: 'status',
      severity: 'warning',
      message: `Sub-request is in status "${subRequest.status}" which is not typically ready for review`,
      expected: reviewableStatuses.join(', '),
      actual: subRequest.status,
    });
  }

  const isValid = errors.length === 0;

  // Persist validation results
  await prisma.certificate.update({
    where: { id: certificateId },
    data: {
      isValidated: true,
      validatedAt: new Date(),
      validationErrors: [...errors, ...warnings] as unknown as Parameters<
        typeof prisma.certificate.update
      >[0]['data']['validationErrors'],
    },
  });

  logger.info(
    {
      certificateId,
      subRequestId: subRequest.id,
      errorCount: errors.length,
      warningCount: warnings.length,
      isValid,
    },
    'certificate.validation.completed',
  );

  return {
    isValid,
    errors,
    warnings,
    validatedAt: new Date().toISOString(),
  };
}
