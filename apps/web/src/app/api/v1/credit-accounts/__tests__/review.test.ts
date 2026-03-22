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
    it('returns valid 0 when approvedLimit is undefined', () => {
      const result = parseApprovedLimit(undefined);
      expect(result).toEqual({ valid: true, value: 0 });
    });

    it('returns valid 0 when approvedLimit is empty string', () => {
      const result = parseApprovedLimit('');
      expect(result).toEqual({ valid: true, value: 0 });
    });

    it('parses a valid integer string', () => {
      const result = parseApprovedLimit('50000');
      expect(result).toEqual({ valid: true, value: 50000 });
    });

    it('parses "0" as valid 0', () => {
      const result = parseApprovedLimit('0');
      expect(result).toEqual({ valid: true, value: 0 });
    });

    it('rejects negative values', () => {
      const result = parseApprovedLimit('-100');
      expect(result.valid).toBe(false);
    });

    it('parses decimal values with up to 2 places', () => {
      const result = parseApprovedLimit('12345.67');
      expect(result).toEqual({ valid: true, value: 12345.67 });
    });

    it('rejects values with more than 2 decimal places', () => {
      const result = parseApprovedLimit('12345.678');
      expect(result.valid).toBe(false);
    });

    it('rejects non-numeric strings', () => {
      const result = parseApprovedLimit('abc');
      expect(result.valid).toBe(false);
    });

    it('rejects mixed alpha-numeric strings', () => {
      const result = parseApprovedLimit('123abc');
      expect(result.valid).toBe(false);
    });

    it('rejects values exceeding maximum', () => {
      const result = parseApprovedLimit('99999999999.99');
      expect(result.valid).toBe(false);
    });

    it('accepts value at maximum boundary', () => {
      const result = parseApprovedLimit('9999999999.99');
      expect(result).toEqual({ valid: true, value: 9999999999.99 });
    });

    it('parses single decimal place', () => {
      const result = parseApprovedLimit('100.5');
      expect(result).toEqual({ valid: true, value: 100.5 });
    });
  });
});
