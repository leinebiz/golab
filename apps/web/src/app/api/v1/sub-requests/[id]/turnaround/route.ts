import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const UpdateTurnaroundSchema = z.object({
  expectedCompletionAt: z.string().datetime().optional(),
  delayReason: z.string().min(5).max(1000).optional(),
  flagDelay: z.boolean().optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = UpdateTurnaroundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const subRequest = await prisma.subRequest.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!subRequest) {
      return NextResponse.json({ error: 'Sub-request not found' }, { status: 404 });
    }

    const activeStatuses = [
      'SAMPLE_ACCEPTED_BY_LAB',
      'TESTING_SCHEDULED',
      'TESTING_IN_PROGRESS',
      'TESTING_DELAYED',
    ];

    if (!activeStatuses.includes(subRequest.status)) {
      return NextResponse.json(
        { error: `Cannot update turnaround in status ${subRequest.status}.` },
        { status: 400 },
      );
    }

    const { expectedCompletionAt, delayReason, flagDelay } = parsed.data;

    const updateData: Record<string, unknown> = {};
    let newStatus = subRequest.status;

    if (expectedCompletionAt) {
      updateData.expectedCompletionAt = new Date(expectedCompletionAt);
    }

    if (flagDelay && delayReason) {
      updateData.delayReason = delayReason;
      newStatus = 'TESTING_DELAYED';
      updateData.status = newStatus;
    }

    const result = await prisma.$transaction(async (tx: typeof prisma) => {
      const updated = await tx.subRequest.update({
        where: { id },
        data: updateData,
      });

      if (newStatus !== subRequest.status) {
        await tx.statusTransition.create({
          data: {
            subRequestId: id,
            fromStatus: subRequest.status,
            toStatus: newStatus,
            triggeredBy: 'lab-user',
            reason: delayReason,
          },
        });
      }

      return updated;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to update turnaround:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
