import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';

/**
 * GET /api/v1/certificates
 *
 * List certificates, optionally filtered by:
 *   - status: "pending" (AWAITING_GOLAB_REVIEW) | "approved" | "returned" | "all"
 *   - subRequestId: filter to a specific sub-request
 *   - page / pageSize: pagination
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission('certificates', 'read');
    const { searchParams } = request.nextUrl;

    const status = searchParams.get('status') ?? 'pending';
    const subRequestId = searchParams.get('subRequestId');
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '25')));

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (subRequestId) {
      where.subRequestId = subRequestId;
    }

    // Map human-readable status filter to DB state
    if (status === 'pending') {
      where.subRequest = { status: 'AWAITING_GOLAB_REVIEW' };
      where.reviewAction = null;
    } else if (status === 'approved') {
      where.reviewAction = 'APPROVED';
    } else if (status === 'returned') {
      where.reviewAction = 'RETURNED_TO_LAB';
    }
    // "all" -> no additional filter

    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        include: {
          subRequest: {
            include: {
              laboratory: { select: { id: true, name: true, code: true } },
              request: { select: { id: true, reference: true, organizationId: true } },
              tests: {
                include: {
                  testCatalogue: { select: { id: true, code: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' }, // oldest first
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.certificate.count({ where }),
    ]);

    return NextResponse.json({
      data: certificates,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    return handleApiError(err, 'certificates.list.failed');
  }
}
