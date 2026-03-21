import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { LogSampleIssueSchema } from '@golab/shared';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
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

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Failed to log sample issue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
