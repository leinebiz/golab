import { NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requirePermission } from '@/lib/auth/middleware';
import { ReviewCertificateSchema } from '@golab/shared';
import { executeTransition } from '@/lib/workflow/engine';
import {
  releaseCertificate,
  prepareGoLabBrandedCertificate,
} from '@/lib/workflow/certificate-release';
import { logger } from '@/lib/observability/logger';

/**
 * POST /api/v1/certificates/:id/review
 * Submit a review action: approve, return to lab, hold, or replicate.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('certificates', 'review');
    const { id } = await params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const userId = user.id as string;
    const userRole = (user.role as string) ?? 'GOLAB_REVIEWER';

    const body = await request.json();
    const parsed = ReviewCertificateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { action, notes } = parsed.data;

    // Verify certificate exists and is reviewable
    const certificate = await prisma.certificate.findUnique({
      where: { id },
      include: {
        subRequest: { select: { id: true, status: true } },
      },
    });

    if (!certificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    if (certificate.subRequest.status !== 'AWAITING_GOLAB_REVIEW') {
      return NextResponse.json(
        { error: `Sub-request is not awaiting review (current: ${certificate.subRequest.status})` },
        { status: 409 },
      );
    }

    // Record the review on the certificate
    await prisma.certificate.update({
      where: { id },
      data: {
        reviewAction: action,
        reviewedById: userId,
        reviewedAt: new Date(),
        reviewNotes: notes ?? null,
      },
    });

    const subRequestId = certificate.subRequestId;
    let result: Record<string, unknown> = { action };

    switch (action) {
      case 'APPROVED': {
        // Transition: AWAITING_GOLAB_REVIEW -> APPROVED_FOR_RELEASE
        await executeTransition({
          entityType: 'SubRequest',
          entityId: subRequestId,
          targetStatus: 'APPROVED_FOR_RELEASE',
          triggeredBy: { userId, role: userRole, type: 'user' },
          reason: notes ?? 'Certificate approved',
        });

        // Auto-release after approval
        const notification = await releaseCertificate({
          subRequestId,
          certificateId: id,
          reviewerId: userId,
          reviewerRole: userRole,
        });
        result = { ...result, notification };
        break;
      }

      case 'RETURNED_TO_LAB': {
        await executeTransition({
          entityType: 'SubRequest',
          entityId: subRequestId,
          targetStatus: 'RETURNED_TO_LAB',
          triggeredBy: { userId, role: userRole, type: 'user' },
          reason: notes ?? 'Certificate returned to lab',
        });
        break;
      }

      case 'ON_HOLD': {
        await executeTransition({
          entityType: 'SubRequest',
          entityId: subRequestId,
          targetStatus: 'ON_HOLD_WITH_GOLAB',
          triggeredBy: { userId, role: userRole, type: 'user' },
          reason: notes ?? 'Certificate placed on hold',
        });
        break;
      }

      case 'REPLICATED_TO_GOLAB_FORMAT': {
        // First approve
        await executeTransition({
          entityType: 'SubRequest',
          entityId: subRequestId,
          targetStatus: 'APPROVED_FOR_RELEASE',
          triggeredBy: { userId, role: userRole, type: 'user' },
          reason: notes ?? 'Certificate approved and replicated to GoLab format',
        });

        // Prepare GoLab branded data
        const brandedData = await prepareGoLabBrandedCertificate(id, userId);

        // Release
        const notification = await releaseCertificate({
          subRequestId,
          certificateId: id,
          reviewerId: userId,
          reviewerRole: userRole,
        });

        result = { ...result, brandedData, notification };
        break;
      }
    }

    logger.info(
      {
        certificateId: id,
        subRequestId,
        action,
        reviewerId: userId,
      },
      'certificate.reviewed',
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Forbidden') {
      return NextResponse.json(
        { error: message },
        { status: message === 'Unauthorized' ? 401 : 403 },
      );
    }
    if (message.startsWith('Invalid transition') || message.startsWith('Guard rejected')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    logger.error({ error }, 'certificate.review.error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
