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

/**
 * Parse the approved limit string the same way the route handler does:
 * `parseFloat(approvedLimit ?? '0')`
 */
export function parseApprovedLimit(approvedLimit: string | undefined): number {
  return parseFloat(approvedLimit ?? '0');
}
