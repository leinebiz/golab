/**
 * Pure where-clause builder extracted from the certificates route handler
 * for testability.
 */

export interface CertificateFilterParams {
  status: string;
  subRequestId: string | null;
  search: string | undefined;
  userRole: string;
  userOrganizationId: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildCertificateWhere(params: CertificateFilterParams): Record<string, any> {
  const { status, subRequestId, search, userRole, userOrganizationId } = params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (subRequestId) {
    where.subRequestId = subRequestId;
  }

  // Map human-readable status filter to DB state
  if (status === 'pending') {
    where.reviewAction = null;
  } else if (status === 'approved') {
    where.reviewAction = 'APPROVED';
  } else if (status === 'returned') {
    where.reviewAction = 'RETURNED_TO_LAB';
  } else if (status === 'on_hold') {
    where.reviewAction = 'ON_HOLD';
  }
  // "all" -> no additional filter

  // Org-scope: customer roles can only see their own org's certificates
  if (['CUSTOMER_ADMIN', 'CUSTOMER_USER'].includes(userRole)) {
    where.subRequest = {
      ...where.subRequest,
      request: {
        ...(where.subRequest?.request ?? {}),
        organizationId: userOrganizationId,
      },
    };
  }

  // Search by request reference
  if (search) {
    where.subRequest = {
      ...where.subRequest,
      request: {
        ...(where.subRequest?.request ?? {}),
        reference: { contains: search, mode: 'insensitive' },
      },
    };
  }

  return where;
}
