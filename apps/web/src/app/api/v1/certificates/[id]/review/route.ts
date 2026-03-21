import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/middleware';
import { executeTransition } from '@/lib/workflow/engine';
import { handleApiError } from '@/lib/api/errors';
import { logger } from '@/lib/observability/logger';
import { ReviewCertificateSchema } from '@golab/shared';

/** Map review actions to sub-request target statuses */
const ACTION_TO_STATUS: Record<string, string> = {
  APPROVED: 'APPROVED_FOR_RELEASE',
  RETURNED_TO_LAB: 'RETURNED_TO_LAB',
  ON_HOLD: 'ON_HOLD_WITH_GOLAB',
  REPLICATED_TO_GOLAB_FORMAT: 'APPROVED_FOR_RELEASE',
};

/**
 * POST /api/v1/certificates/:id/review
 *
 * Submit a review action on a certificate.
 * Body: { action, notes? } validated by ReviewCertificateSchema.
 *
 * On APPROVED / REPLICATED_TO_GOLAB_FORMAT the sub-request transitions to
 * APPROVED_FOR_RELEASE, then a system transition releases to customer.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('certificates', 'review');
    const { id } = await params;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session.user as any).id as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const role = (session.user as any).role as string;

    const body = await request.json();
    const parsed = ReviewCertificateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { action, notes } = parsed.data;

    // Fetch certificate + sub-request
    const certificate = await prisma.certificate.findUnique({
      where: { id },
      include: {
        subRequest: { select: { id: true, status: true, requestId: true } },
      },
    });

    if (!certificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    if (certificate.reviewAction) {
      return NextResponse.json({ error: 'Certificate has already been reviewed' }, { status: 409 });
    }

    if (certificate.subRequest.status !== 'AWAITING_GOLAB_REVIEW') {
      return NextResponse.json(
        {
          error: `Sub-request is not awaiting review (current: ${certificate.subRequest.status})`,
        },
        { status: 409 },
      );
    }

    const targetStatus = ACTION_TO_STATUS[action];
    if (!targetStatus) {
      return NextResponse.json({ error: 'Unknown review action' }, { status: 400 });
    }

    const isApproval = action === 'APPROVED' || action === 'REPLICATED_TO_GOLAB_FORMAT';

    // Update certificate review fields
    await prisma.certificate.update({
      where: { id },
      data: {
        reviewAction: action as Parameters<
          typeof prisma.certificate.update
        >[0]['data']['reviewAction'],
        reviewedById: userId,
        reviewedAt: new Date(),
        reviewNotes: notes ?? null,
      },
    });

    // Transition sub-request status via workflow engine
    await executeTransition({
      entityType: 'SubRequest',
      entityId: certificate.subRequest.id,
      targetStatus,
      triggeredBy: { userId, role, type: 'user' },
      reason: notes,
      metadata: { certificateId: id, reviewAction: action },
    });

    // If approved, trigger release to customer
    if (isApproval) {
      try {
        await executeTransition({
          entityType: 'SubRequest',
          entityId: certificate.subRequest.id,
          targetStatus: 'RELEASED_TO_CUSTOMER',
          triggeredBy: { userId: 'system', role: 'SYSTEM', type: 'system' },
          reason: 'Auto-released after certificate approval',
          metadata: { certificateId: id },
        });

        await prisma.certificate.update({
          where: { id },
          data: { releasedAt: new Date() },
        });
      } catch (releaseErr) {
        // Log but don't fail the review -- release can be retried
        logger.error(
          { certificateId: id, error: releaseErr },
          'certificates.review.release_failed',
        );
      }
    }

    logger.info({ certificateId: id, action, reviewedBy: userId }, 'certificates.reviewed');

    return NextResponse.json({ data: { id, action, status: targetStatus } });
  } catch (err) {
    return handleApiError(err, 'certificates.review.failed');
  }
}
