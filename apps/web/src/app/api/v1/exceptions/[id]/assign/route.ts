import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';

const AssignSchema = z.object({
  assignedToId: z.string().cuid(),
});

/**
 * PATCH /api/v1/exceptions/[id]/assign
 *
 * Assign a sample issue to a user.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['GOLAB_ADMIN', 'GOLAB_REVIEWER']);
    const { id } = await params;

    const body = await request.json();
    const parsed = AssignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const [issue, assignee] = await Promise.all([
      prisma.sampleIssue.findUnique({ where: { id }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: parsed.data.assignedToId }, select: { id: true } }),
    ]);

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }
    if (!assignee) {
      return NextResponse.json({ error: 'Assignee not found' }, { status: 404 });
    }

    const updated = await prisma.sampleIssue.update({
      where: { id },
      data: { assignedToId: parsed.data.assignedToId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err, 'exceptions.assign.failed');
  }
}
