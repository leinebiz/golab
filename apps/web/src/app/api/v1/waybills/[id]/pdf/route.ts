import { NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requireAuth } from '@/lib/auth/middleware';
import { getCourierProvider } from '@/lib/integrations/courier';
import { logger } from '@/lib/observability/logger';

/**
 * GET /api/v1/waybills/[id]/pdf — Download waybill label as PDF.
 * In dev, returns a text-based label. In production, would fetch from courier.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();

    const { id } = await params;

    const waybill = await prisma.waybill.findUnique({
      where: { id },
      include: {
        subRequest: {
          select: {
            subReference: true,
            laboratory: { select: { name: true, code: true } },
            request: { select: { reference: true } },
          },
        },
      },
    });

    if (!waybill) {
      return NextResponse.json({ error: 'Waybill not found' }, { status: 404 });
    }

    // Try to get the label from the courier provider
    try {
      const courier = getCourierProvider();
      const pdfBuffer = await courier.getWaybill(waybill.waybillNumber);

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="waybill-${waybill.waybillNumber}.pdf"`,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } catch {
      // Fallback: generate an HTML-based label
      const collectionAddr = waybill.collectionAddress as Record<string, string>;
      const deliveryAddr = waybill.deliveryAddress as Record<string, string>;

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Waybill ${waybill.waybillNumber}</title>
  <style>
    body { font-family: monospace; padding: 20px; max-width: 600px; margin: 0 auto; }
    .header { text-align: center; border: 2px solid #000; padding: 10px; margin-bottom: 20px; }
    .section { border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; }
    .label { font-weight: bold; color: #666; font-size: 12px; }
    .value { font-size: 14px; margin-bottom: 8px; }
    .barcode { text-align: center; font-size: 24px; letter-spacing: 4px; padding: 20px; border: 1px dashed #000; }
  </style>
</head>
<body>
  <div class="header">
    <h1>WAYBILL</h1>
    <div class="barcode">${waybill.waybillNumber}</div>
  </div>
  <div class="section">
    <div class="label">Request Reference</div>
    <div class="value">${waybill.subRequest?.request?.reference ?? 'N/A'}</div>
    <div class="label">Sub-Request</div>
    <div class="value">${waybill.subRequest?.subReference ?? 'N/A'}</div>
    <div class="label">Laboratory</div>
    <div class="value">${waybill.subRequest?.laboratory?.name ?? 'N/A'} (${waybill.subRequest?.laboratory?.code ?? ''})</div>
  </div>
  <div class="section">
    <div class="label">FROM (Collection)</div>
    <div class="value">${collectionAddr.contactName ?? ''}</div>
    <div class="value">${collectionAddr.line1 ?? ''} ${collectionAddr.line2 ?? ''}</div>
    <div class="value">${collectionAddr.city ?? ''}, ${collectionAddr.province ?? ''} ${collectionAddr.postalCode ?? ''}</div>
    <div class="value">${collectionAddr.contactPhone ?? ''}</div>
  </div>
  <div class="section">
    <div class="label">TO (Delivery)</div>
    <div class="value">${deliveryAddr.contactName ?? ''}</div>
    <div class="value">${deliveryAddr.line1 ?? ''} ${deliveryAddr.line2 ?? ''}</div>
    <div class="value">${deliveryAddr.city ?? ''}, ${deliveryAddr.province ?? ''} ${deliveryAddr.postalCode ?? ''}</div>
    <div class="value">${deliveryAddr.contactPhone ?? ''}</div>
  </div>
  <div class="section">
    <div class="label">Courier</div>
    <div class="value">${waybill.courierProvider}</div>
    <div class="label">Booking ID</div>
    <div class="value">${waybill.courierBookingId ?? 'N/A'}</div>
    <div class="label">Status</div>
    <div class="value">${waybill.status}</div>
    <div class="label">Created</div>
    <div class="value">${waybill.createdAt.toISOString()}</div>
  </div>
</body>
</html>`;

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="waybill-${waybill.waybillNumber}.html"`,
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    logger.error({ error }, 'waybills.pdf.failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
