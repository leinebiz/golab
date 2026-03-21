import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'af-south-1',
});

const S3_BUCKET = process.env.S3_BUCKET ?? 'golab-documents';

// ============================================================
// GET /api/v1/waybills/[id]
// ============================================================

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const waybill = await prisma.waybill.findUnique({
    where: { id },
    include: {
      subRequest: {
        select: {
          id: true,
          status: true,
          requestId: true,
        },
      },
    },
  });

  if (!waybill) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Generate a signed URL for the PDF if available
  let pdfUrl: string | null = null;
  if (waybill.pdfKey) {
    try {
      pdfUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: S3_BUCKET, Key: waybill.pdfKey }),
        { expiresIn: 300 },
      );
    } catch {
      // S3 may not be configured in dev -- return null
      pdfUrl = null;
    }
  }

  return NextResponse.json({
    data: {
      id: waybill.id,
      waybillNumber: waybill.waybillNumber,
      courierProvider: waybill.courierProvider,
      courierBookingId: waybill.courierBookingId,
      status: waybill.status,
      collectionAddress: waybill.collectionAddress,
      deliveryAddress: waybill.deliveryAddress,
      estimatedDelivery: waybill.estimatedDelivery,
      collectedAt: waybill.collectedAt,
      deliveredAt: waybill.deliveredAt,
      trackingEvents: waybill.trackingEvents,
      pdfUrl,
      subRequest: waybill.subRequest,
      createdAt: waybill.createdAt,
    },
  });
}
