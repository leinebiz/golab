import { NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requireAuth } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

/**
 * GET /api/v1/waybills/[id] — Get waybill detail with tracking events.
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
            id: true,
            subReference: true,
            status: true,
            requestId: true,
            laboratory: { select: { id: true, name: true, code: true } },
            request: {
              select: {
                id: true,
                reference: true,
                organizationId: true,
              },
            },
          },
        },
      },
    });

    if (!waybill) {
      return NextResponse.json({ error: 'Waybill not found' }, { status: 404 });
    }

    return NextResponse.json({ data: waybill });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    logger.error({ error }, 'waybills.detail.failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
