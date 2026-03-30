import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();

    const { id } = await params;

    const subRequest = await prisma.subRequest.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            organization: { select: { id: true, name: true } },
          },
        },
        laboratory: { select: { id: true, name: true, code: true } },
        tests: {
          include: {
            testCatalogue: {
              select: { id: true, code: true, name: true, category: true },
            },
          },
        },
        sampleIssues: {
          orderBy: { createdAt: 'desc' },
        },
        certificates: {
          orderBy: { createdAt: 'desc' },
        },
        waybill: true,
      },
    });

    if (!subRequest) {
      return NextResponse.json({ error: 'Sub-request not found' }, { status: 404 });
    }

    return NextResponse.json(subRequest);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    logger.error({ error }, 'subrequest.fetch.failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
