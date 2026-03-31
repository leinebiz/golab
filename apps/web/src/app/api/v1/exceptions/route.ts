import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';
import { executeTransition } from '@/lib/workflow/engine';
const ISSUE_TYPES = [
  'INSUFFICIENT_SAMPLE',
  'SAMPLE_DAMAGED',
  'INCORRECT_TEST_CHOSEN',
  'INCORRECT_PACKAGING',
  'OTHER',
  'MISSING_CUSTOMER_INFO',
  'PAYMENT_NOT_RECEIVED',
  'INSUFFICIENT_CREDIT',
  'COURIER_FAILED_COLLECTION',
  'DELAYED_COLLECTION',
  'DELIVERED_TO_WRONG_LAB',
  'TURNAROUND_DELAY',
  'CERTIFICATE_MISMATCH',
  'CUSTOMER_DISPUTE',
] as const;

/**
 * GET /api/v1/exceptions
 *
 * List sample issues, optionally filtered by resolved status, priority, assignee.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(['GOLAB_ADMIN', 'GOLAB_REVIEWER', 'LAB_ADMIN', 'LAB_TECHNICIAN']);
    const { searchParams } = request.nextUrl;

    const resolved = searchParams.get('resolved');
    const priority = searchParams.get('priority');
    const assignedToId = searchParams.get('assignedToId');
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '25')));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (resolved === 'true') {
      where.resolvedAt = { not: null };
    } else if (resolved === 'false') {
      where.resolvedAt = null;
    }
    if (priority) {
      where.priority = priority;
    }
    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    const [issues, total] = await Promise.all([
      prisma.sampleIssue.findMany({
        where,
        include: {
          subRequest: {
            select: {
              id: true,
              subReference: true,
              status: true,
              request: { select: { id: true, reference: true } },
            },
          },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.sampleIssue.count({ where }),
    ]);

    return NextResponse.json({
      data: issues,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    return handleApiError(err, 'exceptions.list.failed');
  }
}

const CreateExceptionSchema = z.object({
  issueType: z.enum(ISSUE_TYPES),
  comments: z.string().min(1).max(2000),
  subRequestId: z.string().cuid().optional(),
  assignedToId: z.string().cuid().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

const EXCEPTION_ELIGIBLE_STATUSES = [
  'SAMPLE_ACCEPTED_BY_LAB',
  'TESTING_SCHEDULED',
  'TESTING_IN_PROGRESS',
];

/**
 * POST /api/v1/exceptions
 *
 * Create a system-level exception. subRequestId is optional — when omitted,
 * the issue is not tied to a specific sub-request.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['GOLAB_ADMIN', 'GOLAB_REVIEWER']);
    const user = session.user as { id: string; role: string };

    const body = await request.json();
    const parsed = CreateExceptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { issueType, comments, subRequestId, assignedToId, priority } = parsed.data;

    // If subRequestId provided, validate it exists
    let subRequestStatus: string | null = null;
    if (subRequestId) {
      const subRequest = await prisma.subRequest.findUnique({
        where: { id: subRequestId },
        select: { id: true, status: true },
      });
      if (!subRequest) {
        return NextResponse.json({ error: 'Sub-request not found' }, { status: 404 });
      }
      subRequestStatus = subRequest.status;
    }

    const issue = await prisma.sampleIssue.create({
      data: {
        subRequestId: subRequestId ?? null,
        reportedById: user.id,
        issueType,
        comments,
        assignedToId,
        priority: priority ?? 'MEDIUM',
      },
    });

    // Transition sub-request to SAMPLE_EXCEPTION_LOGGED if in a valid state
    if (
      subRequestId &&
      subRequestStatus &&
      EXCEPTION_ELIGIBLE_STATUSES.includes(subRequestStatus)
    ) {
      await executeTransition({
        entityType: 'SubRequest',
        entityId: subRequestId,
        targetStatus: 'SAMPLE_EXCEPTION_LOGGED',
        triggeredBy: { userId: user.id, role: user.role, type: 'user' },
        reason: `${issueType}: ${comments}`,
      });
    }

    return NextResponse.json(issue, { status: 201 });
  } catch (err) {
    return handleApiError(err, 'exceptions.create.failed');
  }
}
