type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'secondary';

export const CREDIT_STATUS_VARIANT: Record<string, BadgeVariant> = {
  NOT_APPLIED: 'secondary',
  PENDING_REVIEW: 'warning',
  APPROVED: 'success',
  DECLINED: 'destructive',
  SUSPENDED: 'destructive',
};

export const INVOICE_STATUS_VARIANT: Record<string, BadgeVariant> = {
  DRAFT: 'secondary',
  ISSUED: 'default',
  PAYMENT_LINK_SENT: 'warning',
  PAID: 'success',
  OVERDUE: 'destructive',
  CANCELLED: 'secondary',
  CREDITED: 'default',
};

export const PAYMENT_STATUS_VARIANT: Record<string, BadgeVariant> = {
  PENDING: 'warning',
  PROCESSING: 'default',
  CONFIRMED: 'success',
  FAILED: 'destructive',
  REFUNDED: 'secondary',
};
