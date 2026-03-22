import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';

/**
 * GET /api/v1/certificates
 *
 * List certificates, optionally filtered by:
 *   - status: "pending" (AWAITING_GOLAB_REVIEW) | "approved" | "returned" | "on_hold" | "all"
 *   - subRequestId: filter to a specific sub-request
 *   - search: filter by request reference (case-insensitive contains)
 *   - page / pageSize: pagination
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission('certificates', 'read');
    const { searchParams } = request.nextUrl;

    const status = searchParams.get('status') ?? 'pending';
    const subRequestId = searchParams.get('subRequestId');
    const search = searchParams.get('search')?.trim();
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
      where.reviewAction = null;
    } else if (status === 'approved') {
      where.reviewAction = 'APPROVED';
    } else if (status === 'returned') {
      where.reviewAction = 'RETURNED_TO_LAB';
    } else if (status === 'on_hold') {
      where.reviewAction = 'ON_HOLD';
    }
    // "all" -> no additional filter

    // Search by request reference
    if (search) {
      where.subRequest = {
        ...where.subRequest,
        request: { reference: { contains: search, mode: 'insensitive' } },
      };
    }

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
