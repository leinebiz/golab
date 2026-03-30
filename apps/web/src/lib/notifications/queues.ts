import { Queue, Worker } from 'bullmq';
import { prisma } from '@golab/database';
import { logger } from '@/lib/observability/logger';
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

// Lazy-initialised queues — avoids Redis connection during Next.js build
let portalQueue: Queue | undefined;
let emailQueue: Queue | undefined;
let whatsappQueue: Queue | undefined;

function getQueue(channel: NotificationChannel): Queue {
  switch (channel) {
    case 'PORTAL':
      if (!portalQueue)
        portalQueue = new Queue('notification-portal', {
          connection: redisConnectionOptions,
          defaultJobOptions,
        });
      return portalQueue;
    case 'EMAIL':
      if (!emailQueue)
        emailQueue = new Queue('notification-email', {
          connection: redisConnectionOptions,
          defaultJobOptions,
        });
      return emailQueue;
    case 'WHATSAPP':
      if (!whatsappQueue)
        whatsappQueue = new Queue('notification-whatsapp', {
          connection: redisConnectionOptions,
          defaultJobOptions,
        });
      return whatsappQueue;
  }
}

/**
 * Enqueue a notification job for async delivery on the correct channel queue.
 */
export async function enqueueNotificationJob(
  channel: NotificationChannel,
  name: string,
  payload: NotificationJobPayload,
  jobId: string,
): Promise<void> {
  await getQueue(channel).add(name, payload, { jobId });
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
// Dead-letter logging — fires when all retries are exhausted
// ---------------------------------------------------------------------------

function attachDeadLetterHandler(worker: Worker): void {
  worker.on('failed', (job, err) => {
    if (job && job.attemptsMade >= (job.opts?.attempts ?? 3)) {
      logger.error(
        {
          jobId: job.id,
          jobName: job.name,
          data: job.data,
          error: err?.message,
          attempts: job.attemptsMade,
        },
        'notification.permanently_failed',
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Workers
// ---------------------------------------------------------------------------

/** Portal worker: DB record already exists, just mark delivered. */
export function createPortalWorker(): Worker<NotificationJobPayload, unknown, string> {
  const worker = new Worker<NotificationJobPayload, unknown, string>(
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
  attachDeadLetterHandler(worker);
  return worker;
}

/** Email worker: sends via email provider, then updates status. */
export function createEmailWorker(): Worker<NotificationJobPayload, unknown, string> {
  const worker = new Worker<NotificationJobPayload, unknown, string>(
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
  attachDeadLetterHandler(worker);
  return worker;
}

/** WhatsApp worker: sends via Twilio provider, then updates status. */
export function createWhatsAppWorker(): Worker<NotificationJobPayload, unknown, string> {
  const worker = new Worker<NotificationJobPayload, unknown, string>(
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
  attachDeadLetterHandler(worker);
  return worker;
}
