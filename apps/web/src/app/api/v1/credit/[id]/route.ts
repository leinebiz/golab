import { NextRequest, NextResponse } from 'next/server';
import { prisma, Prisma } from '@golab/database';
import { requirePermission } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

/**
 * PATCH /api/v1/credit/[id] -- approve, decline, or adjust
 * a credit application.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('creditAccounts', 'approve');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const { id } = await params;
  const body = await request.json();
  const { action, creditLimit, reviewNotes } = body as {
    action: 'approve' | 'decline' | 'adjust';
    creditLimit?: string;
    reviewNotes?: string;
  };

  const account = await prisma.creditAccount.findUnique({
    where: { id },
  });
  if (!account) {
    return NextResponse.json({ error: 'Credit account not found' }, { status: 404 });
  }

  if (action === 'approve') {
    if (!creditLimit) {
      return NextResponse.json({ error: 'creditLimit is required for approval' }, { status: 400 });
    }
    const limit = new Prisma.Decimal(creditLimit);
    await prisma.$transaction(async (tx) => {
      await tx.creditAccount.update({
        where: { id },
        data: {
          status: 'APPROVED',
          creditLimit: limit,
          availableCredit: limit,
          reviewedBy: user.id as string,
          reviewedAt: new Date(),
          reviewNotes,
        },
      });
      await tx.organization.update({
        where: { id: account.organizationId },
        data: { paymentType: 'CREDIT' },
      });
    });
    logger.info(
      { creditAccountId: id, action, creditLimit, actor: user.id },
      'credit.application.approved',
    );
  } else if (action === 'decline') {
    await prisma.creditAccount.update({
      where: { id },
      data: {
        status: 'DECLINED',
        reviewedBy: user.id as string,
        reviewedAt: new Date(),
        reviewNotes,
      },
    });
    logger.info({ creditAccountId: id, action, actor: user.id }, 'credit.application.declined');
  } else if (action === 'adjust') {
    if (!creditLimit) {
      return NextResponse.json(
        { error: 'creditLimit is required for adjustment' },
        { status: 400 },
      );
    }
    const limit = new Prisma.Decimal(creditLimit);
    const outstanding = new Prisma.Decimal(account.outstandingBalance.toString());
    const available = limit.sub(outstanding);
    await prisma.creditAccount.update({
      where: { id },
      data: {
        creditLimit: limit,
        availableCredit: available.gte(0) ? available : new Prisma.Decimal(0),
        reviewedBy: user.id as string,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes ?? `Credit limit adjusted to ${limit.toString()}`,
      },
    });
    logger.info(
      { creditAccountId: id, action, creditLimit, actor: user.id },
      'credit.application.adjusted',
    );
  } else {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
