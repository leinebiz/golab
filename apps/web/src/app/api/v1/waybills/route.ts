import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { auth } from '@/lib/auth/config';
import { getCourierProvider } from '@/lib/integrations/courier';
import type { Address } from '@/lib/integrations/courier';
import { executeTransition } from '@/lib/workflow/engine';
import { createRequestLogger } from '@/lib/observability/logger';

// ============================================================
// GET /api/v1/waybills?subRequestId=...
// ============================================================

export async function GET(request: NextRequest) {
  const subRequestId = request.nextUrl.searchParams.get('subRequestId');

  const where = subRequestId ? { subRequestId } : {};

  const waybills = await prisma.waybill.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      waybillNumber: true,
      courierProvider: true,
      status: true,
      collectionAddress: true,
      deliveryAddress: true,
      estimatedDelivery: true,
      collectedAt: true,
      deliveredAt: true,
      trackingEvents: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: waybills });
}

// ============================================================
// POST /api/v1/waybills — Book a courier pickup for a sub-request
// ============================================================

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as { id: string; role: string };
  if (!['GOLAB_ADMIN', 'SYSTEM'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const reqLogger = createRequestLogger(requestId, user.id);

  let body: { subRequestId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.subRequestId) {
    return NextResponse.json({ error: 'subRequestId is required' }, { status: 400 });
  }

  try {
    // Fetch sub-request with related data
    const subRequest = await prisma.subRequest.findUnique({
      where: { id: body.subRequestId },
      include: {
        waybill: true,
        laboratory: { select: { id: true, name: true, location: true, contactEmail: true } },
        request: {
          select: {
            id: true,
            reference: true,
            collectionAddressId: true,
          },
        },
      },
    });

    if (!subRequest) {
      return NextResponse.json({ error: 'Sub-request not found' }, { status: 404 });
    }

    // Idempotency: already has waybill
    if (subRequest.waybill) {
      return NextResponse.json(
        { error: 'Waybill already exists', waybillId: subRequest.waybill.id },
        { status: 409 },
      );
    }

    if (subRequest.status !== 'PICKUP_REQUESTED') {
      return NextResponse.json(
        { error: `Sub-request must be in PICKUP_REQUESTED status, got ${subRequest.status}` },
        { status: 400 },
      );
    }

    // Fetch collection address
    let collectionAddress = {} as Address;
    if (subRequest.request.collectionAddressId) {
      const addr = await prisma.address.findUnique({
        where: { id: subRequest.request.collectionAddressId },
      });
      if (addr) {
        collectionAddress = {
          contactName: '',
          line1: addr.line1,
          line2: addr.line2 ?? undefined,
          city: addr.city,
          province: addr.province,
          postalCode: addr.postalCode,
          country: addr.country,
          phone: '',
        };
      }
    }

    // Lab delivery address from lab location JSON
    const labLoc = subRequest.laboratory.location as Record<string, string> | null;
    const deliveryAddress: Address = {
      contactName: subRequest.laboratory.name,
      line1: labLoc?.line1 ?? '',
      city: labLoc?.city ?? '',
      province: labLoc?.province ?? '',
      postalCode: labLoc?.postalCode ?? '',
      country: labLoc?.country ?? 'ZA',
      phone: labLoc?.phone ?? '',
      email: subRequest.laboratory.contactEmail ?? undefined,
    };

    // Book courier
    const courier = getCourierProvider();
    const pickupResult = await courier.createPickup({
      subRequestId: subRequest.id,
      collectionAddress,
      deliveryAddress,
      packageDescription: `Laboratory samples for ${subRequest.request.reference}`,
    });

    // Create waybill record
    const waybill = await prisma.waybill.create({
      data: {
        subRequestId: subRequest.id,
        waybillNumber: pickupResult.waybillNumber,
        courierProvider: 'mock',
        courierBookingId: pickupResult.courierBookingId,
        collectionAddress: JSON.parse(JSON.stringify(collectionAddress)),
        deliveryAddress: JSON.parse(JSON.stringify(deliveryAddress)),
        status: 'BOOKED',
        estimatedDelivery: pickupResult.estimatedDelivery,
        trackingEvents: [],
      },
    });

    // Transition sub-request: PICKUP_REQUESTED -> WAYBILL_AVAILABLE
    try {
      await executeTransition({
        entityType: 'SubRequest',
        entityId: subRequest.id,
        targetStatus: 'WAYBILL_AVAILABLE',
        triggeredBy: { userId: user.id, role: user.role, type: 'system' },
        reason: `Courier booked: ${pickupResult.waybillNumber}`,
      });
    } catch (err) {
      reqLogger.warn({ error: err }, 'waybill.transition_skipped');
    }

    reqLogger.info(
      { waybillId: waybill.id, waybillNumber: waybill.waybillNumber, subRequestId: subRequest.id },
      'waybill.created',
    );

    return NextResponse.json({ data: waybill }, { status: 201 });
  } catch (err) {
    reqLogger.error(
      {
        error: err instanceof Error ? err.message : 'Unknown error',
        subRequestId: body.subRequestId,
      },
      'waybill.create.failed',
    );
    return NextResponse.json({ error: 'Failed to book courier' }, { status: 500 });
  }
}
