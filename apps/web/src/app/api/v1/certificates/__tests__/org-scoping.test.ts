import { describe, it, expect } from 'vitest';
import { buildCertificateWhere, type CertificateFilterParams } from '../where-builder';

function baseParams(overrides: Partial<CertificateFilterParams> = {}): CertificateFilterParams {
  return {
    status: 'all',
    subRequestId: null,
    search: undefined,
    userRole: 'GOLAB_ADMIN',
    userOrganizationId: 'org-golab',
    ...overrides,
  };
}

describe('buildCertificateWhere', () => {
  describe('status filtering', () => {
    it('maps "pending" to reviewAction null', () => {
      const where = buildCertificateWhere(baseParams({ status: 'pending' }));
      expect(where.reviewAction).toBeNull();
    });

    it('maps "approved" to APPROVED', () => {
      const where = buildCertificateWhere(baseParams({ status: 'approved' }));
      expect(where.reviewAction).toBe('APPROVED');
    });

    it('maps "returned" to RETURNED_TO_LAB', () => {
      const where = buildCertificateWhere(baseParams({ status: 'returned' }));
      expect(where.reviewAction).toBe('RETURNED_TO_LAB');
    });

    it('maps "on_hold" to ON_HOLD', () => {
      const where = buildCertificateWhere(baseParams({ status: 'on_hold' }));
      expect(where.reviewAction).toBe('ON_HOLD');
    });

    it('does not add reviewAction for "all"', () => {
      const where = buildCertificateWhere(baseParams({ status: 'all' }));
      expect(where).not.toHaveProperty('reviewAction');
    });
  });

  describe('subRequestId filtering', () => {
    it('adds subRequestId when provided', () => {
      const where = buildCertificateWhere(baseParams({ subRequestId: 'sr-1' }));
      expect(where.subRequestId).toBe('sr-1');
    });

    it('omits subRequestId when null', () => {
      const where = buildCertificateWhere(baseParams({ subRequestId: null }));
      expect(where).not.toHaveProperty('subRequestId');
    });
  });

  describe('org-scoping for customer roles', () => {
    it('adds organizationId filter for CUSTOMER_ADMIN', () => {
      const where = buildCertificateWhere(
        baseParams({ userRole: 'CUSTOMER_ADMIN', userOrganizationId: 'org-abc' }),
      );
      expect(where.subRequest.request.organizationId).toBe('org-abc');
    });

    it('adds organizationId filter for CUSTOMER_USER', () => {
      const where = buildCertificateWhere(
        baseParams({ userRole: 'CUSTOMER_USER', userOrganizationId: 'org-xyz' }),
      );
      expect(where.subRequest.request.organizationId).toBe('org-xyz');
    });

    it('does not add org filter for GOLAB_ADMIN', () => {
      const where = buildCertificateWhere(baseParams({ userRole: 'GOLAB_ADMIN' }));
      expect(where).not.toHaveProperty('subRequest');
    });

    it('does not add org filter for GOLAB_FINANCE', () => {
      const where = buildCertificateWhere(baseParams({ userRole: 'GOLAB_FINANCE' }));
      expect(where).not.toHaveProperty('subRequest');
    });
  });

  describe('search filtering', () => {
    it('adds reference contains filter when search is provided', () => {
      const where = buildCertificateWhere(baseParams({ search: 'REF-001' }));
      expect(where.subRequest.request.reference).toEqual({
        contains: 'REF-001',
        mode: 'insensitive',
      });
    });

    it('does not add search filter when search is undefined', () => {
      const where = buildCertificateWhere(baseParams({ search: undefined }));
      expect(where).not.toHaveProperty('subRequest');
    });
  });

  describe('combined filters', () => {
    it('merges org-scoping and search for customer roles', () => {
      const where = buildCertificateWhere(
        baseParams({
          userRole: 'CUSTOMER_ADMIN',
          userOrganizationId: 'org-abc',
          search: 'REF-001',
        }),
      );
      // Both org filter and search filter must coexist on subRequest.request
      expect(where.subRequest.request.organizationId).toBe('org-abc');
      expect(where.subRequest.request.reference).toEqual({
        contains: 'REF-001',
        mode: 'insensitive',
      });
    });

    it('combines status, subRequestId, org-scoping, and search', () => {
      const where = buildCertificateWhere({
        status: 'pending',
        subRequestId: 'sr-99',
        search: 'TEST',
        userRole: 'CUSTOMER_USER',
        userOrganizationId: 'org-123',
      });
      expect(where.reviewAction).toBeNull();
      expect(where.subRequestId).toBe('sr-99');
      expect(where.subRequest.request.organizationId).toBe('org-123');
      expect(where.subRequest.request.reference).toEqual({
        contains: 'TEST',
        mode: 'insensitive',
      });
    });

    it('search without org-scoping for golab roles only adds reference', () => {
      const where = buildCertificateWhere(
        baseParams({ userRole: 'GOLAB_ADMIN', search: 'REF-002' }),
      );
      expect(where.subRequest.request.reference).toEqual({
        contains: 'REF-002',
        mode: 'insensitive',
      });
      expect(where.subRequest.request).not.toHaveProperty('organizationId');
    });
  });
});
