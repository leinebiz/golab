import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

export async function GET(request: NextRequest) {
  try {
    await requireRole(['GOLAB_ADMIN', 'GOLAB_REVIEWER', 'GOLAB_FINANCE']);

    const { searchParams } = request.nextUrl;
    const days = parseInt(searchParams.get('days') ?? '30', 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const revenueResult = await prisma.invoice.aggregate({
      where: { status: 'PAID', paidAt: { gte: since } },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const outstandingResult = await prisma.invoice.aggregate({
      where: { status: { in: ['ISSUED', 'PAYMENT_LINK_SENT', 'OVERDUE'] } },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const overdueResult = await prisma.invoice.aggregate({
      where: { status: 'OVERDUE' },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const creditAccounts = await prisma.creditAccount.findMany({
      where: { status: 'APPROVED' },
      select: { creditLimit: true, availableCredit: true, outstandingBalance: true },
    });

    let totalCreditLimit = 0;
    let totalUtilized = 0;
    for (const acct of creditAccounts) {
      totalCreditLimit += Number(acct.creditLimit);
      totalUtilized += Number(acct.outstandingBalance);
    }
    const creditUtilization =
      totalCreditLimit > 0 ? Math.round((totalUtilized / totalCreditLimit) * 100 * 10) / 10 : 0;

    const paidInvoices = await prisma.invoice.findMany({
      where: { status: 'PAID', paidAt: { gte: since } },
      select: { paidAt: true, totalAmount: true },
      orderBy: { paidAt: 'asc' },
    });

    const revenueByDay: Record<string, number> = {};
    for (const inv of paidInvoices) {
      if (!inv.paidAt) continue;
      const day = inv.paidAt.toISOString().split('T')[0];
      revenueByDay[day] = (revenueByDay[day] ?? 0) + Number(inv.totalAmount);
    }
    const revenueTrend = Object.entries(revenueByDay).map(([date, amount]) => ({
      date,
      amount: Math.round(amount * 100) / 100,
    }));

    return NextResponse.json({
      revenue: {
        total: Number(revenueResult._sum.totalAmount ?? 0),
        invoiceCount: revenueResult._count.id,
      },
      outstanding: {
        total: Number(outstandingResult._sum.totalAmount ?? 0),
        invoiceCount: outstandingResult._count.id,
      },
      overdue: {
        total: Number(overdueResult._sum.totalAmount ?? 0),
        invoiceCount: overdueResult._count.id,
      },
      credit: {
        totalLimit: totalCreditLimit,
        totalUtilized,
        utilizationPercent: creditUtilization,
        accountCount: creditAccounts.length,
      },
      revenueTrend,
      period: { days, since: since.toISOString() },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    logger.error({ error }, 'reports.finance.fetch.failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
