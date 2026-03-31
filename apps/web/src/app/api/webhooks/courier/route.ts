import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import type { WaybillStatus, Prisma } from '@golab/database';
import { logger } from '@/lib/observability/logger';
import { getCourierProvider } from '@/lib/integrations/courier';
import { executeTransition } from '@/lib/workflow/engine';
import { dispatchNotification } from '@/lib/notifications/dispatcher';
import type { NotificationEventType } from '@/lib/notifications/types';

// ============================================================
// Status mapping: courier waybill status -> sub-request status
// ============================================================

const WAYBILL_TO_SUB_REQUEST: Partial<Record<WaybillStatus, string>> = {
  BOOKED: 'WAYBILL_AVAILABLE',
  COLLECTED: 'SAMPLE_COLLECTED',
  IN_TRANSIT: 'IN_TRANSIT_TO_LAB',
  DELIVERED: 'DELIVERED_TO_LAB',
};

// ============================================================
// POST /api/webhooks/courier
// ============================================================

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-courier-signature') ?? '';

  // Verify HMAC
  const provider = getCourierProvider();
  if (!provider.verifyWebhook(rawBody, signature)) {
    logger.warn('courier.webhook.invalid_signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: {
    waybillNumber: string;
    status: WaybillStatus;
    timestamp: string;
    location?: string;
    description?: string;
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { waybillNumber, status, timestamp, location, description } = payload;

  if (!waybillNumber || !status) {
    return NextResponse.json({ error: 'Missing waybillNumber or status' }, { status: 400 });
  }

  // Look up waybill
  const waybill = await prisma.waybill.findUnique({
    where: { waybillNumber },
    select: {
      id: true,
      subRequestId: true,
      trackingEvents: true,
    },
  });

  if (!waybill) {
    logger.warn({ waybillNumber }, 'courier.webhook.unknown_waybill');
    return NextResponse.json({ error: 'Unknown waybill' }, { status: 404 });
  }

  // Append tracking event
  const existingEvents = (waybill.trackingEvents as Record<string, unknown>[] | null) ?? [];
  const newEvent = {
    timestamp: timestamp ?? new Date().toISOString(),
    status,
    location: location ?? null,
    description: description ?? `Status updated to ${status}`,
  };

  await prisma.waybill.update({
    where: { id: waybill.id },
    data: {
      status,
      trackingEvents: [...existingEvents, newEvent] as unknown as Prisma.InputJsonValue,
      ...(status === 'COLLECTED' ? { collectedAt: new Date(timestamp ?? Date.now()) } : {}),
      ...(status === 'DELIVERED' ? { deliveredAt: new Date(timestamp ?? Date.now()) } : {}),
    },
  });

  // Trigger sub-request transition if applicable
  const targetSubRequestStatus = WAYBILL_TO_SUB_REQUEST[status];
  if (targetSubRequestStatus) {
    try {
      await executeTransition({
        entityType: 'SubRequest',
        entityId: waybill.subRequestId,
        targetStatus: targetSubRequestStatus,
        triggeredBy: {
          userId: 'SYSTEM',
          role: 'SYSTEM',
          type: 'webhook',
        },
        reason: `Courier webhook: ${status}`,
        metadata: { waybillNumber, courierStatus: status },
      });
    } catch (err) {
      // Transition may be invalid if the sub-request has already moved past
      // this state (e.g. duplicate webhook). Log but don't fail the webhook.
      logger.warn(
        { waybillNumber, targetSubRequestStatus, error: err },
        'courier.webhook.transition_skipped',
      );
    }
  }

  // Dispatch sample notifications based on status
  const notifyStatus: Partial<Record<WaybillStatus, NotificationEventType>> = {
    COLLECTED: 'sample.collected',
    DELIVERED: 'sample.delivered',
  };
  const eventType = notifyStatus[status];
  if (eventType) {
    // Fetch request info for notification context
    const subReq = await prisma.subRequest.findUnique({
      where: { id: waybill.subRequestId },
      include: { request: { select: { id: true, reference: true, organizationId: true } } },
    });
    if (subReq) {
      const orgUsers = await prisma.user.findMany({
        where: { organizationId: subReq.request.organizationId },
        select: { id: true },
      });
      dispatchNotification(eventType, {
        recipientUserIds: orgUsers.map((u) => u.id),
        requestId: subReq.request.id,
        subRequestId: waybill.subRequestId,
        data: { requestRef: subReq.request.reference, waybillNumber, courierStatus: status },
      }).catch((err) =>
        logger.error({ error: err, waybillNumber }, 'courier.webhook.notification_failed'),
      );
    }
  }

  logger.info({ waybillNumber, status }, 'courier.webhook.processed');

  return NextResponse.json({ ok: true });
}
