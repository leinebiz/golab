import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';

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
