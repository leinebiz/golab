import { describe, it, expect } from 'vitest';
import { computeChanges, AuditActions } from '../prisma-audit-middleware';

describe('prisma-audit-middleware', () => {
  describe('computeChanges', () => {
    it('detects field changes between before and after', () => {
      const before = { name: 'Alice', email: 'alice@old.com' };
      const after = { name: 'Alice', email: 'alice@new.com' };
      const changes = computeChanges(before, after);
      expect(changes).toEqual({
        email: { old: 'alice@old.com', new: 'alice@new.com' },
      });
    });

    it('detects multiple field changes', () => {
      const before = { name: 'Alice', status: 'DRAFT', notes: 'old' };
      const after = { name: 'Bob', status: 'SUBMITTED', notes: 'new' };
      const changes = computeChanges(before, after);
      expect(Object.keys(changes)).toHaveLength(3);
      expect(changes.name).toEqual({ old: 'Alice', new: 'Bob' });
      expect(changes.status).toEqual({ old: 'DRAFT', new: 'SUBMITTED' });
      expect(changes.notes).toEqual({ old: 'old', new: 'new' });
    });

    it('ignores updatedAt field', () => {
      const before = { name: 'Alice', updatedAt: '2026-01-01' };
      const after = { name: 'Alice', updatedAt: '2026-03-28' };
      const changes = computeChanges(before, after);
      expect(changes).toEqual({});
    });

    it('ignores createdAt field', () => {
      const before = { name: 'Alice', createdAt: '2026-01-01' };
      const after = { name: 'Alice', createdAt: '2026-03-28' };
      const changes = computeChanges(before, after);
      expect(changes).toEqual({});
    });

    it('normalizes null and undefined as equivalent', () => {
      const before = { field: null };
      const after = { field: undefined };
      const changes = computeChanges(before, after);
      expect(changes).toEqual({});
    });

    it('normalizes empty string and null as equivalent', () => {
      const before = { field: '' };
      const after = { field: null };
      const changes = computeChanges(before, after);
      expect(changes).toEqual({});
    });

    it('normalizes undefined and empty string as equivalent', () => {
      const before = { field: undefined };
      const after = { field: '' };
      const changes = computeChanges(before, after);
      expect(changes).toEqual({});
    });

    it('detects change from null to a real value', () => {
      const before = { field: null };
      const after = { field: 'hello' };
      const changes = computeChanges(before, after);
      expect(changes).toEqual({
        field: { old: null, new: 'hello' },
      });
    });

    it('returns empty object for identical objects', () => {
      const before = { name: 'Alice', status: 'ACTIVE', count: 42 };
      const after = { name: 'Alice', status: 'ACTIVE', count: 42 };
      const changes = computeChanges(before, after);
      expect(changes).toEqual({});
    });

    it('returns empty object when before is null', () => {
      const after = { name: 'Alice', status: 'ACTIVE' };
      const changes = computeChanges(null, after);
      expect(changes).toEqual({});
    });

    it('returns empty object when before is undefined', () => {
      const after = { name: 'Alice', status: 'ACTIVE' };
      const changes = computeChanges(undefined, after);
      expect(changes).toEqual({});
    });

    it('handles nested object changes via JSON comparison', () => {
      const before = { meta: { a: 1, b: 2 } };
      const after = { meta: { a: 1, b: 3 } };
      const changes = computeChanges(before, after);
      expect(changes).toEqual({
        meta: { old: { a: 1, b: 2 }, new: { a: 1, b: 3 } },
      });
    });

    it('treats identical nested objects as unchanged', () => {
      const before = { meta: { a: 1, b: 2 } };
      const after = { meta: { a: 1, b: 2 } };
      const changes = computeChanges(before, after);
      expect(changes).toEqual({});
    });
  });

  describe('AuditActions', () => {
    it('has auth actions', () => {
      expect(AuditActions.LOGIN_SUCCESS).toBe('login.success');
      expect(AuditActions.LOGIN_FAILED).toBe('login.failed');
      expect(AuditActions.LOGOUT).toBe('logout');
    });

    it('has request actions', () => {
      expect(AuditActions.REQUEST_CREATE).toBe('request.create');
      expect(AuditActions.REQUEST_UPDATE).toBe('request.update');
      expect(AuditActions.REQUEST_STATUS_CHANGE).toBe('request.status_change');
      expect(AuditActions.REQUEST_SUBMIT).toBe('request.submit');
      expect(AuditActions.REQUEST_APPROVE).toBe('request.approve');
      expect(AuditActions.REQUEST_REJECT).toBe('request.reject');
    });

    it('has finance actions', () => {
      expect(AuditActions.QUOTE_GENERATE).toBe('quote.generate');
      expect(AuditActions.INVOICE_CREATE).toBe('invoice.create');
      expect(AuditActions.PAYMENT_RECORD).toBe('payment.record');
      expect(AuditActions.CREDIT_APPLY).toBe('credit.apply');
    });

    it('has certificate actions', () => {
      expect(AuditActions.CERTIFICATE_ISSUE).toBe('certificate.issue');
      expect(AuditActions.CERTIFICATE_DOWNLOAD).toBe('certificate.download');
    });

    it('has organization and user actions', () => {
      expect(AuditActions.ORG_CREATE).toBe('organization.create');
      expect(AuditActions.USER_CREATE).toBe('user.create');
      expect(AuditActions.USER_DEACTIVATE).toBe('user.deactivate');
    });

    it('has system actions', () => {
      expect(AuditActions.SYSTEM_SEED).toBe('system.seed');
      expect(AuditActions.SYSTEM_MIGRATION).toBe('system.migration');
    });

    it('all actions follow prefix.suffix format', () => {
      const actions = Object.values(AuditActions);
      for (const action of actions) {
        // Most actions follow prefix.suffix; logout is an exception
        if (action === 'logout') continue;
        expect(action).toMatch(/^[a-z]+\.[a-z_]+$/);
      }
    });
  });
});
