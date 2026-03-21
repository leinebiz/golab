import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to accept sample:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
