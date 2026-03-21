import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/middleware';
import { createRetestSubRequest } from '@/lib/workflow/certificate-release';
import { logger } from '@/lib/observability/logger';

const RetestSchema = z.object({
  laboratoryId: z.string().cuid().optional(),
});

/**
 * POST /api/v1/sub-requests/:id/retest
 * Create a retest sub-request from an existing one.
 * Optionally specify a different laboratory.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('certificates', 'review');
    const { id } = await params;
    const userId = session.user!.id!;

    const body = await request.json().catch(() => ({}));
    const parsed = RetestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const newSubRequestId = await createRetestSubRequest(id, userId, parsed.data.laboratoryId);

    logger.info(
      {
        originalSubRequestId: id,
        newSubRequestId,
        userId,
      },
      'subrequest.retest.requested',
    );

    return NextResponse.json({ success: true, subRequestId: newSubRequestId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Forbidden') {
      return NextResponse.json(
        { error: message },
        { status: message === 'Unauthorized' ? 401 : 403 },
      );
    }
    logger.error({ error }, 'subrequest.retest.error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
