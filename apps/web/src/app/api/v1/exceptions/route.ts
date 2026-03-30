import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requireRole } from '@/lib/auth/middleware';

/**
 * GET /api/v1/exceptions — List all sample issues for admin management.
 * Supports ?status=open|resolved|all (default: open)
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(['GOLAB_ADMIN', 'GOLAB_REVIEWER']);

    const status = request.nextUrl.searchParams.get('status') ?? 'open';
    const where =
      status === 'open'
        ? { resolvedAt: null }
        : status === 'resolved'
          ? { resolvedAt: { not: null } }
          : {};

    const issues = await prisma.sampleIssue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        subRequest: {
          select: {
            id: true,
            subReference: true,
            status: true,
            request: {
              select: {
                id: true,
                reference: true,
                organization: { select: { id: true, name: true } },
              },
            },
            laboratory: { select: { id: true, name: true } },
          },
        },
      },
    });

    const data = issues.map((issue) => ({
      id: issue.id,
      issueType: issue.issueType,
      comments: issue.comments,
      resolution: issue.resolution,
      resolvedAt: issue.resolvedAt?.toISOString() ?? null,
      resolvedById: issue.resolvedById,
      createdAt: issue.createdAt.toISOString(),
      subRequestId: issue.subRequestId,
      subReference: issue.subRequest.subReference,
      subRequestStatus: issue.subRequest.status,
      requestId: issue.subRequest.request.id,
      requestReference: issue.subRequest.request.reference,
      organizationName: issue.subRequest.request.organization.name,
      labName: issue.subRequest.laboratory.name,
    }));

    return NextResponse.json({ data });
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
