import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { createRequestLogger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';
import { isValidAction, isAuthorizedRole } from '../../review-validation';
import { dispatchNotification } from '@/lib/notifications/dispatcher';

const ReviewSchema = z.object({
  action: z.enum(['approve', 'decline']),
  approvedLimit: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

/** Validate that a string represents a valid credit limit (positive, max 12 digits, max 2 decimals). */
function validateCreditLimit(value: string): { valid: true; limit: number } | { valid: false } {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    return { valid: false };
  }
  const limit = parseFloat(value);
  if (isNaN(limit) || limit < 0 || limit > 9999999999.99) {
    return { valid: false };
  }
  return { valid: true, limit };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as { id: string; role: string };
  if (!isAuthorizedRole(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const requestId = crypto.randomUUID();
  const reqLogger = createRequestLogger(requestId, user.id);

  try {
    const body = await request.json();
    const parsed = ReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { action, approvedLimit, notes } = parsed.data;

    if (!isValidAction(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const account = await prisma.creditAccount.findUnique({ where: { id } });
    if (!account) {
      return NextResponse.json({ error: 'Credit account not found' }, { status: 404 });
    }

    if (action === 'approve') {
      const limitStr = approvedLimit ?? '0';
      const result = validateCreditLimit(limitStr);
      if (!result.valid) {
        return NextResponse.json({ error: 'Invalid credit limit' }, { status: 400 });
      }
      await prisma.$transaction(async (tx) => {
        await tx.creditAccount.update({
          where: { id },
          data: {
            status: 'APPROVED',
            creditLimit: result.limit,
            availableCredit: result.limit,
            reviewedBy: user.id,
            reviewedAt: new Date(),
            reviewNotes: notes ?? null,
          },
        });
      });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.creditAccount.update({
          where: { id },
          data: {
            status: 'DECLINED',
            reviewedBy: user.id,
            reviewedAt: new Date(),
            reviewNotes: notes ?? null,
          },
        });
      });
    }

    metrics.reviewDequeued({ entity: 'credit_account', action });
    reqLogger.info({ creditAccountId: id, action }, 'credit.review.completed');

    // Dispatch credit notification
    const creditAccount = await prisma.creditAccount.findUnique({
      where: { id },
      include: { organization: { include: { users: { select: { id: true } } } } },
    });
    if (creditAccount) {
      const eventType =
        action === 'approve' ? ('credit.approved' as const) : ('credit.declined' as const);
      dispatchNotification(eventType, {
        recipientUserIds: creditAccount.organization.users.map((u: { id: string }) => u.id),
        data: { organizationName: creditAccount.organization.name, action },
      }).catch((err) => reqLogger.error({ error: err }, 'credit.review.notification.failed'));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    reqLogger.error(
      { error: err instanceof Error ? err.message : 'Unknown error', creditAccountId: id },
      'credit.review.failed',
    );
    return NextResponse.json({ error: 'Failed to review credit account' }, { status: 500 });
  }
}
