import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { LogSampleIssueSchema } from '@golab/shared';
import { dispatchNotification } from '@/lib/notifications/dispatcher';
import { requireRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';
import { logger } from '@/lib/observability/logger';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['GOLAB_ADMIN', 'LAB_ADMIN', 'LAB_TECHNICIAN']);
    const { id } = await params;
    const body = await request.json();

    const parsed = LogSampleIssueSchema.safeParse(body);
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

    const validStatuses = ['SAMPLE_ACCEPTED_BY_LAB', 'TESTING_SCHEDULED', 'TESTING_IN_PROGRESS'];

    if (!validStatuses.includes(subRequest.status)) {
      return NextResponse.json(
        { error: `Cannot log issue in status ${subRequest.status}.` },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const issue = await tx.sampleIssue.create({
        data: {
          subRequestId: id,
          reportedById: 'lab-user',
          issueType: parsed.data.issueType,
          comments: parsed.data.comments,
        },
      });

      await tx.subRequest.update({
        where: { id },
        data: { status: 'SAMPLE_EXCEPTION_LOGGED' },
      });

      await tx.statusTransition.create({
        data: {
          subRequestId: id,
          fromStatus: subRequest.status,
          toStatus: 'SAMPLE_EXCEPTION_LOGGED',
          triggeredBy: 'lab-user',
          reason: `${parsed.data.issueType}: ${parsed.data.comments}`,
        },
      });

      return issue;
    });

    // Dispatch sample exception notification
    const subReqWithRequest = await prisma.subRequest.findUnique({
      where: { id },
      include: { request: { select: { id: true, reference: true, organizationId: true } } },
    });
    if (subReqWithRequest) {
      const orgUsers = await prisma.user.findMany({
        where: { organizationId: subReqWithRequest.request.organizationId },
        select: { id: true },
      });
      dispatchNotification('sample.exception', {
        recipientUserIds: orgUsers.map((u) => u.id),
        requestId: subReqWithRequest.request.id,
        subRequestId: id,
        data: {
          requestRef: subReqWithRequest.request.reference,
          issueType: parsed.data.issueType,
          comments: parsed.data.comments,
        },
      }).catch((err) => logger.error({ error: err }, 'sub-request.log-issue.notification.failed'));
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err, 'sub-requests.log-issue.failed');
  }
}
