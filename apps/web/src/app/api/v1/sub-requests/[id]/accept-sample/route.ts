import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { dispatchNotification } from '@/lib/notifications/dispatcher';
import { requireRole } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['GOLAB_ADMIN', 'LAB_ADMIN', 'LAB_TECHNICIAN']);

    const { id } = await params;

    const subRequest = await prisma.subRequest.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!subRequest) {
      return NextResponse.json({ error: 'Sub-request not found' }, { status: 404 });
    }

    if (subRequest.status !== 'DELIVERED_TO_LAB') {
      return NextResponse.json(
        {
          error: `Cannot accept sample in status ${subRequest.status}. Expected DELIVERED_TO_LAB.`,
        },
        { status: 400 },
      );
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.subRequest.update({
        where: { id },
        data: {
          status: 'SAMPLE_ACCEPTED_BY_LAB',
          labAcceptedAt: now,
        },
      });

      await tx.statusTransition.create({
        data: {
          subRequestId: id,
          fromStatus: 'DELIVERED_TO_LAB',
          toStatus: 'SAMPLE_ACCEPTED_BY_LAB',
          triggeredBy: 'lab-user',
        },
      });

      return result;
    });

    // Notify customer that lab accepted the sample
    const subReq = await prisma.subRequest.findUnique({
      where: { id },
      include: { request: { select: { id: true, reference: true, organizationId: true } } },
    });
    if (subReq) {
      const orgUsers = await prisma.user.findMany({
        where: { organizationId: subReq.request.organizationId },
        select: { id: true },
      });
      dispatchNotification('lab.accepted_sample', {
        recipientUserIds: orgUsers.map((u) => u.id),
        requestId: subReq.request.id,
        subRequestId: id,
        data: { requestRef: subReq.request.reference },
      }).catch(() => {});
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    logger.error({ error }, 'subrequest.accept_sample.failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
