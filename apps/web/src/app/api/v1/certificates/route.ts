import { NextResponse } from 'next/server';
import { prisma, type SubRequestStatus } from '@golab/database';
import { requirePermission } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

/**
 * GET /api/v1/certificates
 * Review queue: list sub-requests with certificates awaiting review.
 */
export async function GET(request: Request) {
  try {
    const session = await requirePermission('certificates', 'review');
    const userId = session.user!.id;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const skip = (page - 1) * limit;

    const reviewStatuses: SubRequestStatus[] = ['AWAITING_GOLAB_REVIEW', 'ON_HOLD_WITH_GOLAB'];

    const statusFilter = searchParams.get('status') as SubRequestStatus | null;
    const statuses: SubRequestStatus[] = statusFilter ? [statusFilter] : reviewStatuses;

    const whereClause = {
      status: { in: statuses },
      certificates: { some: {} },
    };

    const [items, total] = await Promise.all([
      prisma.subRequest.findMany({
        where: whereClause,
        include: {
          request: {
            include: {
              organization: { select: { id: true, name: true } },
            },
          },
          laboratory: { select: { id: true, name: true, code: true } },
          tests: {
            include: {
              testCatalogue: { select: { code: true, name: true } },
            },
          },
          certificates: {
            orderBy: { createdAt: 'desc' as const },
            take: 1,
            select: {
              id: true,
              fileName: true,
              format: true,
              createdAt: true,
              isValidated: true,
              reviewAction: true,
              reviewedById: true,
              reviewedAt: true,
            },
          },
        },
        orderBy: { updatedAt: 'asc' as const },
        skip,
        take: limit,
      }),
      prisma.subRequest.count({ where: whereClause }),
    ]);

    logger.info({ userId, page, limit, total }, 'certificates.queue.listed');

    return NextResponse.json({
      items: items.map((sr) => ({
        id: sr.id,
        subReference: sr.subReference,
        requestReference: sr.request.reference,
        requestId: sr.requestId,
        status: sr.status,
        customer: sr.request.organization,
        laboratory: sr.laboratory,
        tests: sr.tests.map((t) => ({
          code: t.testCatalogue.code,
          name: t.testCatalogue.name,
          sampleCount: t.sampleCount,
        })),
        latestCertificate: sr.certificates[0] ?? null,
        uploadedAt: sr.certificates[0]?.createdAt ?? null,
        updatedAt: sr.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Forbidden') {
      return NextResponse.json(
        { error: message },
        { status: message === 'Unauthorized' ? 401 : 403 },
      );
    }
    logger.error({ error }, 'certificates.queue.error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
