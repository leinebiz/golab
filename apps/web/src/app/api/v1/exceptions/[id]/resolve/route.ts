import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';
import { executeTransition } from '@/lib/workflow/engine';
import { logger } from '@/lib/observability/logger';

const ResolveSchema = z.object({
  resolution: z.string().min(1).max(2000),
});

/**
 * PATCH /api/v1/exceptions/[id]/resolve
 *
 * Resolve a sample issue. If the issue is linked to a sub-request currently
 * in SAMPLE_EXCEPTION_LOGGED status, transition it back into the workflow.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(['GOLAB_ADMIN', 'GOLAB_REVIEWER']);
    const user = session.user as { id: string; role: string };
    const { id } = await params;

    const body = await request.json();
    const parsed = ResolveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const issue = await prisma.sampleIssue.findUnique({
      where: { id },
      select: {
        id: true,
        resolvedAt: true,
        subRequestId: true,
        subRequest: { select: { id: true, status: true } },
      },
    });

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    if (issue.resolvedAt) {
      return NextResponse.json({ error: 'Issue already resolved' }, { status: 409 });
    }

    const updated = await prisma.sampleIssue.update({
      where: { id },
      data: {
        resolution: parsed.data.resolution,
        resolvedAt: new Date(),
        resolvedById: user.id,
      },
    });

    // If linked to a sub-request in SAMPLE_EXCEPTION_LOGGED, transition back
    if (issue.subRequestId && issue.subRequest?.status === 'SAMPLE_EXCEPTION_LOGGED') {
      try {
        await executeTransition({
          entityType: 'SubRequest',
          entityId: issue.subRequestId,
          targetStatus: 'TESTING_SCHEDULED',
          triggeredBy: { userId: user.id, role: user.role, type: 'user' },
          reason: `Exception resolved: ${parsed.data.resolution}`,
        });
      } catch (transitionErr) {
        logger.error(
          { issueId: id, subRequestId: issue.subRequestId, error: transitionErr },
          'exceptions.resolve.transitionFailed',
        );
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err, 'exceptions.resolve.failed');
  }
}
