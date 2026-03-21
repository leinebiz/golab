import { prisma, Prisma } from '@golab/database';
import { notificationMatrix } from './matrix';
import { enqueueNotificationJob } from './queues';
import type { NotificationContext, NotificationEventType, NotificationJobPayload } from './types';

/**
 * Dispatch a notification for a given event to all recipients across
 * all configured channels (portal, email, WhatsApp).
 *
 * 1. Looks up the event in the notification matrix
 * 2. Creates a Notification record per (recipient, channel) pair
 * 3. Enqueues a BullMQ job per record for async delivery
 */
export async function dispatchNotification(
  eventType: NotificationEventType,
  context: NotificationContext,
): Promise<void> {
  const entry = notificationMatrix[eventType];
  if (!entry) {
    console.warn(`[notifications] No matrix entry for event: ${eventType}`);
    return;
  }

  const title = entry.title(context.data);
  const body = entry.body(context.data);

  for (const userId of context.recipientUserIds) {
    for (const channel of entry.channels) {
      // Persist the notification record
      const notification = await prisma.notification.create({
        data: {
          userId,
          channel,
          type: eventType,
          title,
          body,
          metadata: context.data as Prisma.InputJsonValue,
          requestId: context.requestId ?? null,
          subRequestId: context.subRequestId ?? null,
        },
      });

      // Build job payload
      const payload: NotificationJobPayload = {
        notificationId: notification.id,
        userId,
        channel,
        eventType,
        title,
        body,
        requestId: context.requestId,
        subRequestId: context.subRequestId,
        data: context.data,
      };

      // Enqueue for async processing
      await enqueueNotificationJob(channel, `${eventType}:${userId}`, payload, notification.id);
    }
  }
}
