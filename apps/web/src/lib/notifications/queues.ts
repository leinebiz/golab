import { Queue, Worker } from 'bullmq';
import { prisma } from '@golab/database';
import { redisConnectionOptions } from './redis';
import type { NotificationChannel, NotificationJobPayload } from './types';
import { sendWhatsAppMessage } from '../integrations/whatsapp/twilio-provider';
import { sendNotificationEmail } from './email-sender';

// ---------------------------------------------------------------------------
// Queue defaults
// ---------------------------------------------------------------------------

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

const portalQueue = new Queue('notification-portal', {
  connection: redisConnectionOptions,
  defaultJobOptions,
});

const emailQueue = new Queue('notification-email', {
  connection: redisConnectionOptions,
  defaultJobOptions,
});

const whatsappQueue = new Queue('notification-whatsapp', {
  connection: redisConnectionOptions,
  defaultJobOptions,
});

/**
 * Enqueue a notification job for async delivery on the correct channel queue.
 */
export async function enqueueNotificationJob(
  channel: NotificationChannel,
  name: string,
  payload: NotificationJobPayload,
  jobId: string,
): Promise<void> {
  const opts = { jobId };
  switch (channel) {
    case 'PORTAL':
      await portalQueue.add(name, payload, opts);
      break;
    case 'EMAIL':
      await emailQueue.add(name, payload, opts);
      break;
    case 'WHATSAPP':
      await whatsappQueue.add(name, payload, opts);
      break;
  }
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

async function markSent(notificationId: string): Promise<void> {
  await prisma.notification.update({
    where: { id: notificationId },
    data: { status: 'SENT', sentAt: new Date() },
  });
}

async function markDelivered(notificationId: string): Promise<void> {
  await prisma.notification.update({
    where: { id: notificationId },
    data: { status: 'DELIVERED', deliveredAt: new Date() },
  });
}

async function markFailed(notificationId: string, reason: string): Promise<void> {
  await prisma.notification.update({
    where: { id: notificationId },
    data: { status: 'FAILED', failureReason: reason },
  });
}

// ---------------------------------------------------------------------------
// Workers
// ---------------------------------------------------------------------------

/** Portal worker: DB record already exists, just mark delivered. */
export function createPortalWorker(): Worker<NotificationJobPayload, unknown, string> {
  return new Worker<NotificationJobPayload, unknown, string>(
    'notification-portal',
    async (job) => {
      await markSent(job.data.notificationId);
      // Portal notifications are "delivered" immediately (user reads in-app)
      await markDelivered(job.data.notificationId);
    },
    {
      connection: redisConnectionOptions,
      concurrency: 10,
    },
  );
}

/** Email worker: sends via email provider, then updates status. */
export function createEmailWorker(): Worker<NotificationJobPayload, unknown, string> {
  return new Worker<NotificationJobPayload, unknown, string>(
    'notification-email',
    async (job) => {
      try {
        const user = await prisma.user.findUniqueOrThrow({
          where: { id: job.data.userId },
          select: { email: true, name: true },
        });
        const result = await sendNotificationEmail({
          to: user.email,
          recipientName: user.name,
          subject: job.data.title,
          body: job.data.body,
          eventType: job.data.eventType,
          data: job.data.data,
        });
        if (result.success) {
          await markSent(job.data.notificationId);
          await markDelivered(job.data.notificationId);
        } else {
          await markFailed(job.data.notificationId, result.error ?? 'Email send failed');
          throw new Error(result.error ?? 'Email send failed');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown email error';
        await markFailed(job.data.notificationId, message);
        throw error; // let BullMQ retry
      }
    },
    {
      connection: redisConnectionOptions,
      concurrency: 5,
    },
  );
}

/** WhatsApp worker: sends via Twilio provider, then updates status. */
export function createWhatsAppWorker(): Worker<NotificationJobPayload, unknown, string> {
  return new Worker<NotificationJobPayload, unknown, string>(
    'notification-whatsapp',
    async (job) => {
      try {
        await sendWhatsAppMessage({
          to: (job.data.data.phone as string) ?? '',
          templateName: job.data.eventType,
          variables: {
            title: job.data.title,
            body: job.data.body,
            ...job.data.data,
          },
        });
        await markSent(job.data.notificationId);
        await markDelivered(job.data.notificationId);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown WhatsApp error';
        await markFailed(job.data.notificationId, message);
        throw error; // let BullMQ retry
      }
    },
    {
      connection: redisConnectionOptions,
      concurrency: 3,
    },
  );
}
