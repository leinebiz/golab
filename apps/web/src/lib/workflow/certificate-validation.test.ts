import { describe, it, expect } from 'vitest';
import {
  validateCertificate,
  isValidCertificate,
  type CertificateMetadata,
  type SubRequestContext,
} from './certificate-validation';

const baseContext: SubRequestContext = {
  subReference: 'REQ-001-A',
  requestReference: 'REQ-001',
  requestedTestCodes: ['WTR-001', 'WTR-002'],
  assignedLabCode: 'LAB-JHB-01',
};

describe('validateCertificate', () => {
  it('returns no errors when all metadata matches', () => {
    const metadata: CertificateMetadata = {
      certificateReference: 'REQ-001-A',
      testCodes: ['WTR-001', 'WTR-002'],
      labCode: 'LAB-JHB-01',
    };

    const results = validateCertificate(metadata, baseContext);
    expect(results).toHaveLength(0);
    expect(isValidCertificate(results)).toBe(true);
  });

  it('accepts reference matching the parent request reference', () => {
    const metadata: CertificateMetadata = {
      certificateReference: 'REQ-001',
      testCodes: ['WTR-001', 'WTR-002'],
      labCode: 'LAB-JHB-01',
    };

    const results = validateCertificate(metadata, baseContext);
    expect(results).toHaveLength(0);
  });

  it('is case-insensitive for all comparisons', () => {
    const metadata: CertificateMetadata = {
      certificateReference: 'req-001-a',
      testCodes: ['wtr-001', 'wtr-002'],
      labCode: 'lab-jhb-01',
    };

    const results = validateCertificate(metadata, baseContext);
    expect(results).toHaveLength(0);
  });

  it('returns error when reference does not match', () => {
    const metadata: CertificateMetadata = {
      certificateReference: 'REQ-999',
      testCodes: ['WTR-001', 'WTR-002'],
      labCode: 'LAB-JHB-01',
    };

    const results = validateCertificate(metadata, baseContext);
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('error');
    expect(results[0].field).toBe('certificateReference');
    expect(isValidCertificate(results)).toBe(false);
  });

  it('returns error when a requested test is missing from certificate', () => {
    const metadata: CertificateMetadata = {
      certificateReference: 'REQ-001-A',
      testCodes: ['WTR-001'], // missing WTR-002
      labCode: 'LAB-JHB-01',
    };

    const results = validateCertificate(metadata, baseContext);
    const errors = results.filter((r) => r.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('WTR-002');
  });

  it('returns warning when certificate contains unrequested test', () => {
    const metadata: CertificateMetadata = {
      certificateReference: 'REQ-001-A',
      testCodes: ['WTR-001', 'WTR-002', 'WTR-EXTRA'],
      labCode: 'LAB-JHB-01',
    };

    const results = validateCertificate(metadata, baseContext);
    const warnings = results.filter((r) => r.severity === 'warning');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('WTR-EXTRA');
    expect(isValidCertificate(results)).toBe(true); // warnings only
  });

  it('returns error when lab code does not match', () => {
    const metadata: CertificateMetadata = {
      certificateReference: 'REQ-001-A',
      testCodes: ['WTR-001', 'WTR-002'],
      labCode: 'LAB-CPT-01', // wrong lab
    };

    const results = validateCertificate(metadata, baseContext);
    const errors = results.filter((r) => r.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('labCode');
    expect(isValidCertificate(results)).toBe(false);
  });

  it('returns warnings when metadata fields are missing', () => {
    const metadata: CertificateMetadata = {};

    const results = validateCertificate(metadata, baseContext);
    // Should get 3 warnings: reference, testCodes, labCode
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.severity === 'warning')).toBe(true);
    expect(isValidCertificate(results)).toBe(true); // warnings only
  });

  it('returns warnings for empty test codes array', () => {
    const metadata: CertificateMetadata = {
      certificateReference: 'REQ-001-A',
      testCodes: [],
      labCode: 'LAB-JHB-01',
    };

    const results = validateCertificate(metadata, baseContext);
    const warnings = results.filter((r) => r.severity === 'warning');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].field).toBe('testCodes');
  });

  it('can return multiple errors simultaneously', () => {
    const metadata: CertificateMetadata = {
      certificateReference: 'WRONG-REF',
      testCodes: ['WRONG-TEST'],
      labCode: 'WRONG-LAB',
    };

    const results = validateCertificate(metadata, baseContext);
    const errors = results.filter((r) => r.severity === 'error');
    // 1 ref error + 2 missing test errors + 1 extra test warning + 1 lab error = 4 errors, 1 warning
    expect(errors.length).toBeGreaterThanOrEqual(3);
    expect(isValidCertificate(results)).toBe(false);
  });
});
