/**
 * Channel and status types matching the Prisma schema enums.
 * Defined locally to avoid transitive re-export issues with Prisma client.
 */
export type NotificationChannel = 'PORTAL' | 'EMAIL' | 'WHATSAPP';
export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';

/** All notification event types in the system */
export type NotificationEventType =
  | 'quote.ready'
  | 'quote.accepted'
  | 'invoice.generated'
  | 'payment.confirmed'
  | 'credit.approved'
  | 'credit.declined'
  | 'sample.collected'
  | 'sample.delivered'
  | 'sample.exception'
  | 'testing.started'
  | 'testing.completed'
  | 'results.ready'
  | 'certificate.available'
  | 'request.status_changed';

/** Context passed to the dispatcher for fan-out */
export interface NotificationContext {
  /** The user ID(s) to notify */
  recipientUserIds: string[];
  /** Optional request reference */
  requestId?: string;
  /** Optional sub-request reference */
  subRequestId?: string;
  /** Event-specific data for template rendering */
  data: Record<string, unknown>;
}

/** A single notification job payload */
export interface NotificationJobPayload {
  notificationId: string;
  userId: string;
  channel: NotificationChannel;
  eventType: NotificationEventType;
  title: string;
  body: string;
  requestId?: string;
  subRequestId?: string;
  data: Record<string, unknown>;
}

/** Matrix entry: which channels to use per event type */
export interface NotificationMatrixEntry {
  title: (data: Record<string, unknown>) => string;
  body: (data: Record<string, unknown>) => string;
  channels: NotificationChannel[];
}
