import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@golab/database';
import { requireAuth } from '@/lib/auth/middleware';
import { getCourierProvider } from '@/lib/integrations/courier';
import { executeTransition } from '@/lib/workflow/engine';
import { logger } from '@/lib/observability/logger';

/**
 * GET /api/v1/waybills — List waybills.
 * Filters by sub-request or request if query params are provided.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = request.nextUrl;
    const subRequestId = searchParams.get('subRequestId');
    const requestId = searchParams.get('requestId');

    const where: Record<string, unknown> = {};
    if (subRequestId) {
      where.subRequestId = subRequestId;
    }
    if (requestId) {
      where.subRequest = { requestId };
    }

    const waybills = await prisma.waybill.findMany({
      where,
      include: {
        subRequest: {
          select: {
            id: true,
            subReference: true,
            status: true,
            requestId: true,
            laboratory: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: waybills });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    logger.error({ error }, 'waybills.list.failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/v1/waybills — Create a pickup request and generate a waybill.
 *
 * Body: {
 *   subRequestId: string;
 *   collectionAddress: CourierAddress;
 *   deliveryAddress: CourierAddress;
 *   parcelCount?: number;
 *   weightKg?: number;
 *   instructions?: string;
 *   preferredPickupDate?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const {
      subRequestId,
      collectionAddress,
      deliveryAddress,
      parcelCount,
      weightKg,
      instructions,
      preferredPickupDate,
    } = body;

    if (!subRequestId || !collectionAddress || !deliveryAddress) {
      return NextResponse.json(
        { error: 'subRequestId, collectionAddress, and deliveryAddress are required' },
        { status: 400 },
      );
    }

    // Verify sub-request exists and doesn't already have a waybill
    const subRequest = await prisma.subRequest.findUnique({
      where: { id: subRequestId },
      include: { waybill: true, request: true },
    });

    if (!subRequest) {
      return NextResponse.json({ error: 'Sub-request not found' }, { status: 404 });
    }

    if (subRequest.waybill) {
      return NextResponse.json(
        {
          error: 'Waybill already exists for this sub-request',
          waybillId: subRequest.waybill.id,
        },
        { status: 409 },
      );
    }

    // Book pickup with courier provider
    const courier = getCourierProvider();
    const pickupResult = await courier.createPickup({
      subRequestId,
      reference: subRequest.subReference,
      collectionAddress,
      deliveryAddress,
      parcelCount: parcelCount ?? 1,
      weightKg: weightKg ?? 1,
      instructions,
      preferredPickupDate,
    });

    // Create waybill record
    const waybill = await prisma.waybill.create({
      data: {
        subRequestId,
        waybillNumber: pickupResult.waybillNumber,
        courierProvider: courier.name,
        courierBookingId: pickupResult.courierBookingId,
        collectionAddress: JSON.parse(JSON.stringify(collectionAddress)),
        deliveryAddress: JSON.parse(JSON.stringify(deliveryAddress)),
        status: 'BOOKED',
        estimatedDelivery: pickupResult.estimatedDelivery,
        trackingEvents: JSON.parse(
          JSON.stringify([
            {
              timestamp: new Date().toISOString(),
              status: 'BOOKED',
              description: 'Pickup booked with courier',
            },
          ]),
        ),
      },
    });

    // Transition sub-request to WAYBILL_AVAILABLE
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = session.user as any;
      await executeTransition({
        entityType: 'SubRequest',
        entityId: subRequestId,
        targetStatus: 'WAYBILL_AVAILABLE',
        triggeredBy: {
          userId: user.id ?? 'system',
          role: user.role ?? 'SYSTEM',
          type: 'system',
        },
      });
    } catch (transitionError) {
      // Log but don't fail the waybill creation — the waybill is already booked
      logger.error({ subRequestId, error: transitionError }, 'waybills.create.transition_failed');
    }

    logger.info(
      { waybillId: waybill.id, waybillNumber: waybill.waybillNumber, subRequestId },
      'waybills.created',
    );

    return NextResponse.json({ data: waybill }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === 'Forbidden') {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    logger.error({ error }, 'waybills.create.failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
