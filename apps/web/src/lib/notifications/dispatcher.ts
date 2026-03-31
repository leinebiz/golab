import { prisma, Prisma } from '@golab/database';
import { notificationMatrix } from './matrix';
import { enqueueNotificationJob } from './queues';
import { logger } from '@/lib/observability/logger';
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
    logger.warn({ eventType }, 'notifications.dispatch.unknown_event');
    return;
  }

  const title = entry.title(context.data);
  const body = entry.body(context.data);

  const notificationInputs = context.recipientUserIds.flatMap((userId) =>
    entry.channels.map((channel) => ({ userId, channel })),
  );

  // Persist all notifications in a single transaction
  const notifications = await prisma.$transaction(
    notificationInputs.map((input) =>
      prisma.notification.create({
        data: {
          userId: input.userId,
          channel: input.channel,
          type: eventType,
          title,
          body,
          metadata: context.data as Prisma.InputJsonValue,
          requestId: context.requestId ?? null,
          subRequestId: context.subRequestId ?? null,
        },
      }),
    ),
  );

  // Enqueue jobs for async delivery
  for (let i = 0; i < notifications.length; i++) {
    const notification = notifications[i];
    const input = notificationInputs[i];
    const payload: NotificationJobPayload = {
      notificationId: notification.id,
      userId: input.userId,
      channel: input.channel,
      eventType,
      title,
      body,
      requestId: context.requestId,
      subRequestId: context.subRequestId,
      data: context.data,
    };
    await enqueueNotificationJob(
      input.channel,
      `${eventType}:${input.userId}`,
      payload,
      notification.id,
    );
  }
}
