export { dispatchNotification } from './dispatcher';
export { notificationMatrix } from './matrix';
export {
  portalQueue,
  emailQueue,
  whatsappQueue,
  createPortalWorker,
  createEmailWorker,
  createWhatsAppWorker,
} from './queues';
export type {
  NotificationEventType,
  NotificationContext,
  NotificationJobPayload,
  NotificationMatrixEntry,
} from './types';
