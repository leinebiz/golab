import { NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requireAuth } from '@/lib/auth/middleware';
import { getCourierProvider } from '@/lib/integrations/courier';
import { logger } from '@/lib/observability/logger';

/**
 * GET /api/v1/waybills/[id]/track — Get latest tracking status from courier.
 * Also updates the waybill record in the database with new events.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();

    const { id } = await params;

    const waybill = await prisma.waybill.findUnique({
      where: { id },
    });

    if (!waybill) {
      return NextResponse.json({ error: 'Waybill not found' }, { status: 404 });
    }

    // Fetch live tracking from courier provider
    const courier = getCourierProvider();
    const tracking = await courier.trackShipment(waybill.waybillNumber);

    // Update waybill with latest status and events
    const updatedWaybill = await prisma.waybill.update({
      where: { id },
      data: {
        status: tracking.currentStatus,
        trackingEvents: JSON.parse(JSON.stringify(tracking.events)),
        ...(tracking.currentStatus === 'COLLECTED' && !waybill.collectedAt
          ? { collectedAt: new Date() }
          : {}),
        ...(tracking.currentStatus === 'DELIVERED' && !waybill.deliveredAt
          ? { deliveredAt: new Date() }
          : {}),
        ...(tracking.estimatedDelivery ? { estimatedDelivery: tracking.estimatedDelivery } : {}),
      },
    });

    logger.info(
      {
        waybillId: id,
        waybillNumber: waybill.waybillNumber,
        status: tracking.currentStatus,
        eventCount: tracking.events.length,
      },
      'waybills.track.updated',
    );

    return NextResponse.json({
      data: {
        waybillId: updatedWaybill.id,
        waybillNumber: updatedWaybill.waybillNumber,
        status: tracking.currentStatus,
        estimatedDelivery: tracking.estimatedDelivery,
        events: tracking.events,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    logger.error({ error }, 'waybills.track.failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
