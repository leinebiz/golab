import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const days = parseInt(searchParams.get('days') ?? '30', 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const prevSince = new Date();
    prevSince.setDate(prevSince.getDate() - days * 2);

    const [
      totalRequests,
      activeRequests,
      completedRequests,
      prevTotalRequests,
      prevCompletedRequests,
      totalOrganizations,
      revenueResult,
      prevRevenueResult,
    ] = await Promise.all([
      prisma.request.count({ where: { createdAt: { gte: since } } }),
      prisma.request.count({
        where: {
          status: { notIn: ['CLOSED', 'CANCELLED', 'DRAFT'] },
          createdAt: { gte: since },
        },
      }),
      prisma.request.count({
        where: { status: 'CLOSED', closedAt: { gte: since } },
      }),
      prisma.request.count({
        where: { createdAt: { gte: prevSince, lt: since } },
      }),
      prisma.request.count({
        where: { status: 'CLOSED', closedAt: { gte: prevSince, lt: since } },
      }),
      prisma.organization.count({ where: { type: 'CUSTOMER' } }),
      prisma.invoice.aggregate({
        where: { status: 'PAID', paidAt: { gte: since } },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { status: 'PAID', paidAt: { gte: prevSince, lt: since } },
        _sum: { totalAmount: true },
      }),
    ]);

    const revenue = Number(revenueResult._sum.totalAmount ?? 0);
    const prevRevenue = Number(prevRevenueResult._sum.totalAmount ?? 0);

    function calcChange(current: number, previous: number) {
      if (previous === 0)
        return { percent: current > 0 ? 100 : 0, trend: current > 0 ? 'up' : 'flat' };
      const percent = ((current - previous) / previous) * 100;
      return {
        percent,
        trend: percent > 0 ? 'up' : percent < 0 ? 'down' : 'flat',
      };
    }

    const requestChange = calcChange(totalRequests, prevTotalRequests);
    const completedChange = calcChange(completedRequests, prevCompletedRequests);
    const revenueChange = calcChange(revenue, prevRevenue);

    return NextResponse.json({
      kpis: [
        {
          key: 'total_requests',
          label: 'Total Requests',
          value: totalRequests,
          trend: requestChange.trend,
          changePercent: requestChange.percent,
        },
        {
          key: 'active_requests',
          label: 'Active Requests',
          value: activeRequests,
          trend: 'flat' as const,
          changePercent: 0,
        },
        {
          key: 'completed',
          label: 'Completed',
          value: completedRequests,
          trend: completedChange.trend,
          changePercent: completedChange.percent,
        },
        {
          key: 'revenue',
          label: 'Revenue (ZAR)',
          value: revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 }),
          trend: revenueChange.trend,
          changePercent: revenueChange.percent,
        },
        {
          key: 'customers',
          label: 'Total Customers',
          value: totalOrganizations,
          trend: 'flat' as const,
          changePercent: 0,
        },
      ],
      period: { days, since: since.toISOString() },
    });
  } catch (error) {
    console.error('Failed to fetch KPIs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
