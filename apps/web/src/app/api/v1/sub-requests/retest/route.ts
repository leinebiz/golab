import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';
import { logger } from '@/lib/observability/logger';

type TransactionClient = Parameters<Parameters<(typeof prisma)['$transaction']>[0]>[0];

const RetestSchema = z.object({
  /** The original sub-request to retest from */
  sourceSubRequestId: z.string().min(1),
  /** Optionally override the laboratory for re-routing */
  laboratoryId: z.string().min(1).optional(),
  /** Reason for the retest */
  reason: z.string().min(5).max(2000),
});

/**
 * POST /api/v1/sub-requests/retest
 *
 * Create a new sub-request from an existing one (retest or re-route to
 * another lab). Copies the tests from the source sub-request.
 */
export async function POST(request: Request) {
  try {
    const session = await requirePermission('requests', 'update');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session.user as any).id as string;

    const body = await request.json();
    const parsed = RetestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { sourceSubRequestId, laboratoryId, reason } = parsed.data;

    // Fetch source sub-request with tests
    const source = await prisma.subRequest.findUnique({
      where: { id: sourceSubRequestId },
      include: {
        request: { select: { id: true, reference: true } },
        tests: {
          include: { testCatalogue: { select: { id: true, basePrice: true } } },
        },
      },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source sub-request not found' }, { status: 404 });
    }

    const targetLabId = laboratoryId ?? source.laboratoryId;

    // Verify target lab exists and is active
    const lab = await prisma.laboratory.findUnique({
      where: { id: targetLabId },
      select: { id: true, isActive: true },
    });

    if (!lab || !lab.isActive) {
      return NextResponse.json(
        { error: 'Target laboratory not found or inactive' },
        { status: 400 },
      );
    }

    // Count existing sub-requests to generate next sub-reference
    const existingCount = await prisma.subRequest.count({
      where: { requestId: source.requestId },
    });
    const suffix = String.fromCharCode(65 + existingCount); // A, B, C, ...
    const subReference = `${source.request.reference}-${suffix}`;

    // Create new sub-request with same tests in a transaction
    const newSubRequest = await prisma.$transaction(async (tx: TransactionClient) => {
      const sr = await tx.subRequest.create({
        data: {
          subReference,
          requestId: source.requestId,
          laboratoryId: targetLabId,
          status: 'PICKUP_REQUESTED',
        },
      });

      // Copy tests from source (batch insert)
      await tx.subRequestTest.createMany({
        data: source.tests.map((test) => ({
          subRequestId: sr.id,
          testCatalogueId: test.testCatalogueId,
          sampleCount: test.sampleCount,
          accreditationRequired: test.accreditationRequired,
          unitPrice: test.unitPrice,
          totalPrice: test.totalPrice,
        })),
      });

      // Record transition
      await tx.statusTransition.create({
        data: {
          subRequestId: sr.id,
          fromStatus: 'NEW',
          toStatus: 'PICKUP_REQUESTED',
          triggeredBy: userId,
          reason,
          metadata: { sourceSubRequestId, isRetest: true },
        },
      });

      return sr;
    });

    logger.info(
      {
        newSubRequestId: newSubRequest.id,
        sourceSubRequestId,
        requestId: source.requestId,
        reason,
      },
      'sub-request.retest.created',
    );

    return NextResponse.json({ data: newSubRequest }, { status: 201 });
  } catch (err) {
    return handleApiError(err, 'sub-request.retest.failed');
  }
}
