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
      // New metrics
      quotedRequests,
      acceptedQuotes,
      cancelledRequests,
      creditPending,
      creditApproved,
      creditDeclined,
      totalIssues,
      resolvedIssues,
      retestRequests,
      certificateCount,
      certificatesWithErrors,
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
      // Quote conversion: requests that got quotes
      prisma.request.count({
        where: { createdAt: { gte: since }, quote: { isNot: null } },
      }),
      // Accepted quotes
      prisma.request.count({
        where: { createdAt: { gte: since }, quote: { isAccepted: true } },
      }),
      // Abandoned/cancelled
      prisma.request.count({
        where: { createdAt: { gte: since }, status: 'CANCELLED' },
      }),
      // Credit cycle time
      prisma.creditAccount.count({
        where: { status: 'PENDING_REVIEW' },
      }),
      prisma.creditAccount.count({
        where: { status: 'APPROVED', reviewedAt: { gte: since } },
      }),
      prisma.creditAccount.count({
        where: { status: 'DECLINED', reviewedAt: { gte: since } },
      }),
      // Sample exceptions
      prisma.sampleIssue.count({
        where: { createdAt: { gte: since } },
      }),
      prisma.sampleIssue.count({
        where: { createdAt: { gte: since }, resolvedAt: { not: null } },
      }),
      // Retest rate
      prisma.request.count({
        where: { createdAt: { gte: since }, customerAction: 'RETEST' },
      }),
      // Certificate error rate
      prisma.certificate.count({
        where: { createdAt: { gte: since } },
      }),
      prisma.certificate.count({
        where: { createdAt: { gte: since }, reviewAction: 'RETURNED_TO_LAB' },
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

    // Derived metrics
    const quoteConversionRate = quotedRequests > 0 ? (acceptedQuotes / quotedRequests) * 100 : 0;
    const abandonedQuoteRate =
      quotedRequests > 0
        ? ((quotedRequests - acceptedQuotes - cancelledRequests) / quotedRequests) * 100
        : 0;
    const sampleRejectionRate = totalIssues;
    const retestRate = completedRequests > 0 ? (retestRequests / completedRequests) * 100 : 0;
    const certErrorRate =
      certificateCount > 0 ? (certificatesWithErrors / certificateCount) * 100 : 0;

    // Credit approval cycle time (avg days)
    const creditAccounts = await prisma.creditAccount.findMany({
      where: { reviewedAt: { gte: since } },
      select: { applicationDate: true, reviewedAt: true },
    });
    const cycleDays = creditAccounts
      .filter((ca) => ca.applicationDate && ca.reviewedAt)
      .map(
        (ca) => (ca.reviewedAt!.getTime() - ca.applicationDate!.getTime()) / (1000 * 60 * 60 * 24),
      );
    const avgCreditCycleDays =
      cycleDays.length > 0
        ? Math.round((cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length) * 10) / 10
        : 0;

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
        {
          key: 'quote_conversion',
          label: 'Quote Conversion Rate',
          value: `${quoteConversionRate.toFixed(1)}%`,
          trend: 'flat' as const,
          changePercent: 0,
        },
        {
          key: 'abandoned_quote',
          label: 'Abandoned Quote Rate',
          value: `${abandonedQuoteRate.toFixed(1)}%`,
          trend: 'flat' as const,
          changePercent: 0,
        },
        {
          key: 'credit_cycle_days',
          label: 'Credit Approval (Avg Days)',
          value: avgCreditCycleDays,
          trend: 'flat' as const,
          changePercent: 0,
        },
        {
          key: 'sample_rejections',
          label: 'Sample Exceptions',
          value: sampleRejectionRate,
          trend: 'flat' as const,
          changePercent: 0,
        },
        {
          key: 'cert_error_rate',
          label: 'Certificate Error Rate',
          value: `${certErrorRate.toFixed(1)}%`,
          trend: 'flat' as const,
          changePercent: 0,
        },
        {
          key: 'retest_rate',
          label: 'Retest Rate',
          value: `${retestRate.toFixed(1)}%`,
          trend: 'flat' as const,
          changePercent: 0,
        },
      ],
      creditSummary: {
        pending: creditPending,
        approved: creditApproved,
        declined: creditDeclined,
        avgCycleDays: avgCreditCycleDays,
      },
      exceptionSummary: {
        total: totalIssues,
        resolved: resolvedIssues,
        open: totalIssues - resolvedIssues,
      },
      period: { days, since: since.toISOString() },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    logger.error({ error }, 'reports.kpis.fetch.failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
