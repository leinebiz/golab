import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@golab/database';
import type { WaybillStatus } from '@golab/database';
import { executeTransition } from '@/lib/workflow/engine';
import { logger } from '@/lib/observability/logger';
import crypto from 'crypto';

/**
 * Verify webhook signature from courier provider.
 * Uses HMAC-SHA256 with the COURIER_WEBHOOK_SECRET.
 */
function verifySignature(payload: string, signature: string | null): boolean {
  const secret = process.env.COURIER_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn('courier.webhook.no_secret_configured');
    return false;
  }

  if (!signature) {
    return false;
  }

  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Map courier status strings to our WaybillStatus enum.
 */
function mapCourierStatus(courierStatus: string): WaybillStatus | null {
  const statusMap: Record<string, WaybillStatus> = {
    booked: 'BOOKED',
    collected: 'COLLECTED',
    in_transit: 'IN_TRANSIT',
    out_for_delivery: 'OUT_FOR_DELIVERY',
    delivered: 'DELIVERED',
    failed: 'FAILED',
    returned: 'RETURNED',
  };

  return statusMap[courierStatus.toLowerCase()] ?? null;
}

/**
 * Map waybill status to the corresponding sub-request status for automatic transitions.
 */
function getSubRequestTransition(waybillStatus: WaybillStatus): string | null {
  const transitionMap: Record<string, string> = {
    COLLECTED: 'SAMPLE_COLLECTED',
    IN_TRANSIT: 'IN_TRANSIT_TO_LAB',
    DELIVERED: 'DELIVERED_TO_LAB',
  };

  return transitionMap[waybillStatus] ?? null;
}

/**
 * POST /api/webhooks/courier — Receive courier status updates.
 *
 * Expected payload:
 * {
 *   waybillNumber: string;
 *   status: string;
 *   timestamp: string;
 *   description?: string;
 *   location?: string;
 * }
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-courier-signature');

    // Verify webhook signature (skip in development for easier testing)
    if (process.env.NODE_ENV === 'production') {
      if (!verifySignature(rawBody, signature)) {
        logger.warn({ requestId }, 'courier.webhook.invalid_signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);
    const { waybillNumber, status, timestamp, description, location } = body;

    if (!waybillNumber || !status) {
      return NextResponse.json({ error: 'waybillNumber and status are required' }, { status: 400 });
    }

    const mappedStatus = mapCourierStatus(status);
    if (!mappedStatus) {
      logger.warn({ requestId, waybillNumber, status }, 'courier.webhook.unknown_status');
      return NextResponse.json({ error: `Unknown status: ${status}` }, { status: 400 });
    }

    // Find the waybill
    const waybill = await prisma.waybill.findUnique({
      where: { waybillNumber },
      include: { subRequest: true },
    });

    if (!waybill) {
      logger.warn({ requestId, waybillNumber }, 'courier.webhook.waybill_not_found');
      return NextResponse.json({ error: 'Waybill not found' }, { status: 404 });
    }

    // Append tracking event
    const existingEvents = (waybill.trackingEvents as Array<Record<string, unknown>>) ?? [];
    const newEvent = {
      timestamp: timestamp ?? new Date().toISOString(),
      status: mappedStatus,
      description: description ?? `Status updated to ${mappedStatus}`,
      location,
    };

    // Update waybill
    await prisma.waybill.update({
      where: { id: waybill.id },
      data: {
        status: mappedStatus,
        trackingEvents: JSON.parse(JSON.stringify([...existingEvents, newEvent])),
        ...(mappedStatus === 'COLLECTED' ? { collectedAt: new Date() } : {}),
        ...(mappedStatus === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
      },
    });

    logger.info(
      {
        requestId,
        waybillId: waybill.id,
        waybillNumber,
        previousStatus: waybill.status,
        newStatus: mappedStatus,
      },
      'courier.webhook.status_updated',
    );

    // Trigger sub-request status transition if applicable
    const subRequestTarget = getSubRequestTransition(mappedStatus);
    if (subRequestTarget && waybill.subRequest) {
      try {
        await executeTransition({
          entityType: 'SubRequest',
          entityId: waybill.subRequestId,
          targetStatus: subRequestTarget,
          triggeredBy: {
            userId: 'system',
            role: 'SYSTEM',
            type: 'webhook',
          },
          reason: `Courier webhook: ${mappedStatus}`,
          metadata: { waybillNumber, courierStatus: status },
        });

        logger.info(
          {
            requestId,
            subRequestId: waybill.subRequestId,
            targetStatus: subRequestTarget,
          },
          'courier.webhook.subrequest_transitioned',
        );
      } catch (transitionError) {
        // Log but don't fail the webhook — the waybill status is already updated
        logger.error(
          {
            requestId,
            subRequestId: waybill.subRequestId,
            targetStatus: subRequestTarget,
            error: transitionError,
          },
          'courier.webhook.subrequest_transition_failed',
        );
      }
    }

    return NextResponse.json({ received: true, waybillId: waybill.id });
  } catch (error) {
    logger.error({ requestId, error }, 'courier.webhook.processing_failed');
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
