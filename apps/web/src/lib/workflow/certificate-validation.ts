/**
 * Certificate validation engine.
 *
 * Validates that an uploaded certificate matches the associated sub-request:
 *   - Reference on certificate matches request reference
 *   - Test codes match requested tests
 *   - Lab code matches assigned lab
 *
 * Returns a list of validation errors and warnings.
 */

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationResult {
  field: string;
  severity: ValidationSeverity;
  message: string;
}

export interface CertificateMetadata {
  /** The reference string found on the certificate PDF */
  certificateReference?: string;
  /** Test codes listed on the certificate */
  testCodes?: string[];
  /** Lab code printed on the certificate */
  labCode?: string;
}

export interface SubRequestContext {
  /** The sub-request reference (e.g. "REQ-001-A") */
  subReference: string;
  /** The parent request reference (e.g. "REQ-001") */
  requestReference: string;
  /** Test catalogue codes that were requested */
  requestedTestCodes: string[];
  /** The code of the assigned laboratory */
  assignedLabCode: string;
}

/**
 * Validate certificate metadata against the sub-request it belongs to.
 *
 * If metadata fields are missing (e.g. not yet extracted from the PDF),
 * those checks produce warnings rather than errors -- manual review is still
 * required.
 */
export function validateCertificate(
  metadata: CertificateMetadata,
  context: SubRequestContext,
): ValidationResult[] {
  const results: ValidationResult[] = [];

  // --- Reference validation ---
  if (!metadata.certificateReference) {
    results.push({
      field: 'certificateReference',
      severity: 'warning',
      message: 'Certificate reference could not be extracted -- manual verification required.',
    });
  } else {
    const certRef = metadata.certificateReference.trim().toUpperCase();
    const subRef = context.subReference.trim().toUpperCase();
    const reqRef = context.requestReference.trim().toUpperCase();

    if (certRef !== subRef && certRef !== reqRef) {
      results.push({
        field: 'certificateReference',
        severity: 'error',
        message: `Certificate reference "${metadata.certificateReference}" does not match sub-request "${context.subReference}" or request "${context.requestReference}".`,
      });
    }
  }

  // --- Test codes validation ---
  if (!metadata.testCodes || metadata.testCodes.length === 0) {
    results.push({
      field: 'testCodes',
      severity: 'warning',
      message:
        'Test codes could not be extracted from certificate -- manual verification required.',
    });
  } else {
    const certCodes = new Set(metadata.testCodes.map((c) => c.trim().toUpperCase()));
    const requestedCodes = new Set(context.requestedTestCodes.map((c) => c.trim().toUpperCase()));

    // Check for missing tests (requested but not on certificate)
    for (const code of requestedCodes) {
      if (!certCodes.has(code)) {
        results.push({
          field: 'testCodes',
          severity: 'error',
          message: `Requested test "${code}" is missing from the certificate.`,
        });
      }
    }

    // Check for extra tests (on certificate but not requested)
    for (const code of certCodes) {
      if (!requestedCodes.has(code)) {
        results.push({
          field: 'testCodes',
          severity: 'warning',
          message: `Certificate contains unrequested test "${code}".`,
        });
      }
    }
  }

  // --- Lab code validation ---
  if (!metadata.labCode) {
    results.push({
      field: 'labCode',
      severity: 'warning',
      message: 'Lab code could not be extracted from certificate -- manual verification required.',
    });
  } else {
    const certLabCode = metadata.labCode.trim().toUpperCase();
    const assignedLabCode = context.assignedLabCode.trim().toUpperCase();

    if (certLabCode !== assignedLabCode) {
      results.push({
        field: 'labCode',
        severity: 'error',
        message: `Certificate lab code "${metadata.labCode}" does not match assigned lab "${context.assignedLabCode}".`,
      });
    }
  }

  return results;
}

/**
 * Convenience: returns true when there are zero errors (warnings are OK).
 */
export function isValidCertificate(results: ValidationResult[]): boolean {
  return !results.some((r) => r.severity === 'error');
}
