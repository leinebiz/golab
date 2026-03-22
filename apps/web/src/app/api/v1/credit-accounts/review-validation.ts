/**
 * Pure validation helpers extracted from the credit review route handler
 * for testability.
 */

const VALID_ACTIONS = ['approve', 'decline'] as const;
const ALLOWED_ROLES = ['GOLAB_ADMIN', 'GOLAB_FINANCE'] as const;

export type ReviewAction = (typeof VALID_ACTIONS)[number];

export function isValidAction(action: unknown): action is ReviewAction {
  return typeof action === 'string' && VALID_ACTIONS.includes(action as ReviewAction);
}

export function isAuthorizedRole(role: string): boolean {
  return (ALLOWED_ROLES as readonly string[]).includes(role);
}

export type ParsedLimit = { valid: true; value: number } | { valid: false; error: string };

/**
 * Parse and validate the approved credit limit string.
 *
 * Rejects non-numeric strings, negative values, values with more than
 * 2 decimal places, and values exceeding the Decimal(12,2) column max.
 */
export function parseApprovedLimit(approvedLimit: string | undefined): ParsedLimit {
  if (approvedLimit === undefined || approvedLimit === '') {
    return { valid: true, value: 0 };
  }

  // Must be digits with optional up-to-2 decimal places
  if (!/^\d+(\.\d{1,2})?$/.test(approvedLimit)) {
    return {
      valid: false,
      error: 'Invalid format: must be a positive number with at most 2 decimal places',
    };
  }

  const value = parseFloat(approvedLimit);
  if (isNaN(value)) {
    return { valid: false, error: 'Not a valid number' };
  }

  if (value < 0) {
    return { valid: false, error: 'Credit limit must not be negative' };
  }

  if (value > 9999999999.99) {
    return { valid: false, error: 'Credit limit exceeds maximum allowed value' };
  }

  return { valid: true, value };
}
