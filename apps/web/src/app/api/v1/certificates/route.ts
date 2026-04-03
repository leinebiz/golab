import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/middleware';
import { auth } from '@/lib/auth/config';
import { handleApiError } from '@/lib/api/errors';
import { createRequestLogger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';
import { buildCertificateWhere } from './where-builder';

const UUID_RE = /^[0-9a-f-]{36}$/i;
const MAX_SEARCH_LENGTH = 200;

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
    const rawSearch = searchParams.get('search')?.trim();
    const search = rawSearch ? rawSearch.slice(0, MAX_SEARCH_LENGTH) : undefined;
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '25')));

    // Validate subRequestId format when provided
    if (subRequestId && !UUID_RE.test(subRequestId)) {
      return NextResponse.json({ error: 'Invalid subRequestId format' }, { status: 400 });
    }

    // Org-scope: resolve current user for role-based filtering
    const session = await auth();
    const user = session!.user as { id: string; role: string; organizationId: string };
    const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
    const reqLogger = createRequestLogger(requestId, user.id);

    const where = buildCertificateWhere({
      status,
      subRequestId,
      search,
      userRole: user.role,
      userOrganizationId: user.organizationId,
    });

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

    reqLogger.info({ total, page, pageSize }, 'certificates.list.completed');

    return NextResponse.json({
      data: certificates,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    return handleApiError(err, 'certificates.list.failed');
  }
}
