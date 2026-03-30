import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requireRole } from '@/lib/auth/middleware';
import { z } from 'zod';

const ResolveSchema = z.object({
  resolution: z.string().min(5, 'Resolution must be at least 5 characters').max(2000),
});

/**
 * POST /api/v1/exceptions/:id/resolve — Resolve a sample issue.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(['GOLAB_ADMIN', 'GOLAB_REVIEWER']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session.user as any).id as string;
    const { id } = await params;

    const body = await req.json();
    const parsed = ResolveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const issue = await prisma.sampleIssue.findUnique({ where: { id } });
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    if (issue.resolvedAt) {
      return NextResponse.json({ error: 'Issue has already been resolved' }, { status: 409 });
    }

    const updated = await prisma.sampleIssue.update({
      where: { id },
      data: {
        resolution: parsed.data.resolution,
        resolvedAt: new Date(),
        resolvedById: userId,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
