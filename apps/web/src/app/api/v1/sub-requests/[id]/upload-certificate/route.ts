import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { dispatchNotification } from '@/lib/notifications/dispatcher';
import { requireRole } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['GOLAB_ADMIN', 'GOLAB_REVIEWER', 'LAB_ADMIN', 'LAB_TECHNICIAN']);

    const { id } = await params;

    const subRequest = await prisma.subRequest.findUnique({
      where: { id },
      select: { id: true, status: true, subReference: true },
    });

    if (!subRequest) {
      return NextResponse.json({ error: 'Sub-request not found' }, { status: 404 });
    }

    const validStatuses = [
      'TESTING_IN_PROGRESS',
      'TESTING_COMPLETED',
      'TESTING_DELAYED',
      'RETURNED_TO_LAB',
    ];

    if (!validStatuses.includes(subRequest.status)) {
      return NextResponse.json(
        { error: `Cannot upload certificate in status ${subRequest.status}.` },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 });
    }

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 20MB limit' }, { status: 400 });
    }

    // In production, file would be uploaded to S3/R2.
    // For now, generate a placeholder key.
    const fileKey = `certificates/${subRequest.subReference}/${Date.now()}-${file.name}`;

    const result = await prisma.$transaction(async (tx) => {
      const existingCount = await tx.certificate.count({
        where: { subRequestId: id },
      });

      const certificate = await tx.certificate.create({
        data: {
          subRequestId: id,
          uploadedById: 'lab-user',
          format: 'LAB_ORIGINAL',
          version: existingCount + 1,
          originalFileKey: fileKey,
          fileName: file.name,
          mimeType: file.type,
        },
      });

      await tx.subRequest.update({
        where: { id },
        data: {
          status: 'AWAITING_GOLAB_REVIEW',
          testingCompletedAt: new Date(),
        },
      });

      await tx.statusTransition.create({
        data: {
          subRequestId: id,
          fromStatus: subRequest.status,
          toStatus: 'AWAITING_GOLAB_REVIEW',
          triggeredBy: 'lab-user',
          reason: `Certificate uploaded: ${file.name}`,
        },
      });

      return certificate;
    });

    // Dispatch notifications: testing.completed + certificate.awaiting_review
    const subReq = await prisma.subRequest.findUnique({
      where: { id },
      include: { request: { select: { id: true, reference: true, organizationId: true } } },
    });
    if (subReq) {
      // Notify customer that testing is complete
      const orgUsers = await prisma.user.findMany({
        where: { organizationId: subReq.request.organizationId },
        select: { id: true },
      });
      dispatchNotification('testing.completed', {
        recipientUserIds: orgUsers.map((u) => u.id),
        requestId: subReq.request.id,
        subRequestId: id,
        data: { requestRef: subReq.request.reference },
      }).catch(() => {});

      // Notify GoLab reviewers that certificate is awaiting review
      const golabReviewers = await prisma.user.findMany({
        where: { role: { in: ['GOLAB_ADMIN', 'GOLAB_REVIEWER'] } },
        select: { id: true },
      });
      dispatchNotification('certificate.awaiting_review', {
        recipientUserIds: golabReviewers.map((u) => u.id),
        requestId: subReq.request.id,
        subRequestId: id,
        data: { requestRef: subReq.request.reference },
      }).catch(() => {});
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    logger.error({ error }, 'subrequest.certificate.upload.failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
