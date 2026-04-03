import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';
import { toCents, addDecimalStrings } from '@/lib/finance/decimal';

export async function GET(request: NextRequest) {
  try {
    await requireRole(['GOLAB_ADMIN', 'GOLAB_REVIEWER']);
    const { searchParams } = request.nextUrl;
    const days = parseInt(searchParams.get('days') ?? '30', 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [revenueResult, outstandingResult, overdueResult, creditAccounts, paidInvoices] =
      await Promise.all([
        prisma.invoice.aggregate({
          where: { status: 'PAID', paidAt: { gte: since } },
          _sum: { totalAmount: true },
          _count: { id: true },
        }),
        prisma.invoice.aggregate({
          where: { status: { in: ['ISSUED', 'PAYMENT_LINK_SENT', 'OVERDUE'] } },
          _sum: { totalAmount: true },
          _count: { id: true },
        }),
        prisma.invoice.aggregate({
          where: { status: 'OVERDUE' },
          _sum: { totalAmount: true },
          _count: { id: true },
        }),
        prisma.creditAccount.findMany({
          where: { status: 'APPROVED' },
          select: { creditLimit: true, availableCredit: true, outstandingBalance: true },
        }),
        prisma.invoice.findMany({
          where: { status: 'PAID', paidAt: { gte: since } },
          select: { paidAt: true, totalAmount: true },
          orderBy: { paidAt: 'asc' },
        }),
      ]);

    let totalCreditLimit = '0.00';
    let totalUtilized = '0.00';
    for (const acct of creditAccounts) {
      totalCreditLimit = addDecimalStrings(
        totalCreditLimit,
        acct.creditLimit?.toString() ?? '0.00',
      );
      totalUtilized = addDecimalStrings(
        totalUtilized,
        acct.outstandingBalance?.toString() ?? '0.00',
      );
    }
    const creditLimitCents = toCents(totalCreditLimit);
    const utilizedCents = toCents(totalUtilized);
    const creditUtilization =
      creditLimitCents > 0 ? Math.round((utilizedCents / creditLimitCents) * 100 * 10) / 10 : 0;

    const revenueByDay: Record<string, string> = {};
    for (const inv of paidInvoices) {
      if (!inv.paidAt) continue;
      const day = inv.paidAt.toISOString().split('T')[0];
      revenueByDay[day] = addDecimalStrings(
        revenueByDay[day] ?? '0.00',
        inv.totalAmount?.toString() ?? '0.00',
      );
    }
    const revenueTrend = Object.entries(revenueByDay).map(([date, amount]) => ({
      date,
      amount,
    }));

    return NextResponse.json({
      revenue: {
        total: revenueResult._sum.totalAmount?.toString() ?? '0.00',
        invoiceCount: revenueResult._count.id,
      },
      outstanding: {
        total: outstandingResult._sum.totalAmount?.toString() ?? '0.00',
        invoiceCount: outstandingResult._count.id,
      },
      overdue: {
        total: overdueResult._sum.totalAmount?.toString() ?? '0.00',
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
  } catch (error) {
    return handleApiError(error, 'reports.finance.failed');
  }
}
