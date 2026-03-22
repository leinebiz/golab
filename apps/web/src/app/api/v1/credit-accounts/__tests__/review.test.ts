import { describe, it, expect } from 'vitest';
import { isValidAction, isAuthorizedRole, parseApprovedLimit } from '../review-validation';

describe('credit review validation', () => {
  describe('isValidAction', () => {
    it('accepts "approve"', () => {
      expect(isValidAction('approve')).toBe(true);
    });

    it('accepts "decline"', () => {
      expect(isValidAction('decline')).toBe(true);
    });

    it('rejects empty string', () => {
      expect(isValidAction('')).toBe(false);
    });

    it('rejects undefined', () => {
      expect(isValidAction(undefined)).toBe(false);
    });

    it('rejects null', () => {
      expect(isValidAction(null)).toBe(false);
    });

    it('rejects unrelated strings', () => {
      expect(isValidAction('cancel')).toBe(false);
      expect(isValidAction('APPROVE')).toBe(false);
      expect(isValidAction('Decline')).toBe(false);
    });

    it('rejects non-string types', () => {
      expect(isValidAction(42)).toBe(false);
      expect(isValidAction(true)).toBe(false);
      expect(isValidAction({})).toBe(false);
    });
  });

  describe('isAuthorizedRole', () => {
    it('allows GOLAB_ADMIN', () => {
      expect(isAuthorizedRole('GOLAB_ADMIN')).toBe(true);
    });

    it('allows GOLAB_FINANCE', () => {
      expect(isAuthorizedRole('GOLAB_FINANCE')).toBe(true);
    });

    it('denies CUSTOMER_ADMIN', () => {
      expect(isAuthorizedRole('CUSTOMER_ADMIN')).toBe(false);
    });

    it('denies CUSTOMER_USER', () => {
      expect(isAuthorizedRole('CUSTOMER_USER')).toBe(false);
    });

    it('denies GOLAB_USER', () => {
      expect(isAuthorizedRole('GOLAB_USER')).toBe(false);
    });

    it('denies empty string', () => {
      expect(isAuthorizedRole('')).toBe(false);
    });
  });

  describe('parseApprovedLimit', () => {
    it('returns 0 when approvedLimit is undefined', () => {
      expect(parseApprovedLimit(undefined)).toBe(0);
    });

    it('parses a valid numeric string', () => {
      expect(parseApprovedLimit('50000')).toBe(50000);
    });

    it('parses "0" as 0', () => {
      expect(parseApprovedLimit('0')).toBe(0);
    });

    it('parses negative values', () => {
      expect(parseApprovedLimit('-100')).toBe(-100);
    });

    it('parses decimal values', () => {
      expect(parseApprovedLimit('12345.67')).toBeCloseTo(12345.67);
    });

    it('returns NaN for non-numeric strings', () => {
      expect(parseApprovedLimit('abc')).toBeNaN();
    });

    it('parses leading numeric portion of mixed strings', () => {
      // parseFloat('123abc') returns 123 — this is JS behavior
      expect(parseApprovedLimit('123abc')).toBe(123);
    });

    it('returns NaN for empty string', () => {
      expect(parseApprovedLimit('')).toBeNaN();
    });
  });
});
