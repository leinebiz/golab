export { dispatchNotification } from './dispatcher';
export { notificationMatrix } from './matrix';
export {
  enqueueNotificationJob,
  createPortalWorker,
  createEmailWorker,
  createWhatsAppWorker,
} from './queues';
export { sendNotificationEmail } from './email-sender';
export { getEmailTemplate } from './templates';
export type {
  NotificationEventType,
  NotificationContext,
  NotificationJobPayload,
  NotificationMatrixEntry,
} from './types';
