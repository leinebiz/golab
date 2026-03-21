import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@golab/database';
import { requirePermission } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('reports', 'read');
    const { searchParams } = request.nextUrl;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date();
    const from = searchParams.get('from')
      ? new Date(searchParams.get('from')!)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    const paidInvoices = await prisma.invoice.findMany({
      where: { status: 'PAID', paidAt: { gte: from, lte: to } },
      select: { totalAmount: true, paidAt: true },
      orderBy: { paidAt: 'asc' },
    });
    const revenueByDay: Record<string, number> = {};
    for (const inv of paidInvoices) {
      if (!inv.paidAt) continue;
      const day = inv.paidAt.toISOString().slice(0, 10);
      revenueByDay[day] = (revenueByDay[day] ?? 0) + Number(inv.totalAmount);
    }
    const revenueTrend = Object.entries(revenueByDay).map(([date, amount]) => ({
      date,
      revenue: Math.round(amount * 100) / 100,
    }));
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    const now = new Date();
    const overdueInvoices = await prisma.invoice.findMany({
      where: { status: { in: ['ISSUED', 'PAYMENT_LINK_SENT', 'OVERDUE'] } },
      select: { totalAmount: true, dueDate: true, issuedAt: true },
    });
    const agingBuckets = { current: 0, days30: 0, days60: 0, days90Plus: 0 };
    for (const inv of overdueInvoices) {
      const daysPastDue = Math.max(0, (now.getTime() - inv.dueDate.getTime()) / 86400000);
      const amount = Number(inv.totalAmount);
      if (daysPastDue <= 0) agingBuckets.current += amount;
      else if (daysPastDue <= 30) agingBuckets.days30 += amount;
      else if (daysPastDue <= 60) agingBuckets.days60 += amount;
      else agingBuckets.days90Plus += amount;
    }
    const outstanding = [
      { name: 'Current', value: Math.round(agingBuckets.current * 100) / 100 },
      { name: '1-30 Days', value: Math.round(agingBuckets.days30 * 100) / 100 },
      { name: '31-60 Days', value: Math.round(agingBuckets.days60 * 100) / 100 },
      { name: '90+ Days', value: Math.round(agingBuckets.days90Plus * 100) / 100 },
    ];

    const creditAccounts = await prisma.creditAccount.findMany({
      where: { status: 'APPROVED' },
      select: {
        creditLimit: true,
        availableCredit: true,
        outstandingBalance: true,
        organization: { select: { id: true, name: true } },
      },
    });
    const creditUtilization = creditAccounts.map((ca) => {
      const limit = Number(ca.creditLimit);
      const used = Number(ca.outstandingBalance);
      return {
        customerId: ca.organization.id,
        customerName: ca.organization.name,
        creditLimit: limit,
        outstandingBalance: used,
        availableCredit: Number(ca.availableCredit),
        utilizationPercent: limit > 0 ? Math.round((used / limit) * 1000) / 10 : 0,
      };
    });

    const periodLength = to.getTime() - from.getTime();
    const previousPaidInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        paidAt: { gte: new Date(from.getTime() - periodLength), lte: from },
      },
      select: { totalAmount: true },
    });
    const previousRevenue = previousPaidInvoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount),
      0,
    );
    const revenueChange =
      previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const totalOutstanding = overdueInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    return NextResponse.json({
      kpis: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        revenueChange: Math.round(revenueChange * 10) / 10,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      },
      revenueTrend,
      outstanding,
      creditUtilization,
      dateRange: { from: from.toISOString(), to: to.toISOString() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'reports.financial.failed');
    if (message === 'Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
