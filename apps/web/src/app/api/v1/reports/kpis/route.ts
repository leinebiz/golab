import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';

const MS_PER_HOUR = 1000 * 60 * 60;

interface WaybillRow {
  collectedAt: Date | null;
  deliveredAt: Date | null;
  estimatedDelivery: Date | null;
}

interface SubRequestRow {
  testingStartedAt: Date | null;
  testingCompletedAt: Date | null;
  expectedCompletionAt: Date | null;
}

/** Compute the average hours between two Date fields across a list of records. */
function avgHoursBetween<T>(
  records: T[],
  getStart: (r: T) => Date | null,
  getEnd: (r: T) => Date | null,
): number {
  let total = 0;
  let count = 0;
  for (const r of records) {
    const start = getStart(r);
    const end = getEnd(r);
    if (start && end) {
      total += (end.getTime() - start.getTime()) / MS_PER_HOUR;
      count++;
    }
  }
  return count > 0 ? Math.round((total / count) * 10) / 10 : 0;
}

export async function GET(request: NextRequest) {
  try {
    await requireRole(['GOLAB_ADMIN', 'GOLAB_REVIEWER']);
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
      deliveredWaybills,
      completedSubRequests,
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
      prisma.waybill.findMany({
        where: { deliveredAt: { not: null, gte: since } },
        select: { collectedAt: true, deliveredAt: true, estimatedDelivery: true },
      }),
      prisma.subRequest.findMany({
        where: { testingCompletedAt: { not: null, gte: since } },
        select: {
          testingStartedAt: true,
          testingCompletedAt: true,
          expectedCompletionAt: true,
        },
      }),
    ]);

    const revenue = revenueResult._sum.totalAmount?.toString() ?? '0.00';

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
    const revenueChange = calcChange(
      Number(revenueResult._sum.totalAmount ?? 0),
      Number(prevRevenueResult._sum.totalAmount ?? 0),
    );

    // Courier performance KPIs
    const waybills = deliveredWaybills as WaybillRow[];
    const totalDelivered = waybills.length;
    const onTimeCount = waybills.filter(
      (w) => w.deliveredAt && w.estimatedDelivery && w.deliveredAt <= w.estimatedDelivery,
    ).length;
    const courierOnTimeRate = totalDelivered > 0 ? onTimeCount / totalDelivered : 0;
    const courierAvgDeliveryHours = avgHoursBetween(
      waybills,
      (w) => w.collectedAt,
      (w) => w.deliveredAt,
    );

    // Lab turnaround KPIs
    const subRequests = completedSubRequests as SubRequestRow[];
    const totalCompleted = subRequests.length;
    const slaCompliantCount = subRequests.filter(
      (sr) =>
        sr.testingCompletedAt &&
        sr.expectedCompletionAt &&
        sr.testingCompletedAt <= sr.expectedCompletionAt,
    ).length;
    const labSlaComplianceRate = totalCompleted > 0 ? slaCompliantCount / totalCompleted : 0;
    const labAvgTurnaroundHours = avgHoursBetween(
      subRequests,
      (sr) => sr.testingStartedAt,
      (sr) => sr.testingCompletedAt,
    );

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
          value: revenue,
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
          key: 'courier_on_time_rate',
          label: 'Courier On-Time Rate',
          value: courierOnTimeRate,
          trend: 'flat' as const,
          changePercent: 0,
        },
        {
          key: 'courier_avg_delivery_hours',
          label: 'Avg Delivery Time (hours)',
          value: courierAvgDeliveryHours,
          trend: 'flat' as const,
          changePercent: 0,
        },
        {
          key: 'lab_sla_compliance_rate',
          label: 'Lab SLA Compliance',
          value: labSlaComplianceRate,
          trend: 'flat' as const,
          changePercent: 0,
        },
        {
          key: 'lab_avg_turnaround_hours',
          label: 'Avg Lab Turnaround (hours)',
          value: labAvgTurnaroundHours,
          trend: 'flat' as const,
          changePercent: 0,
        },
      ],
      period: { days, since: since.toISOString() },
    });
  } catch (error) {
    return handleApiError(error, 'reports.kpis.failed');
  }
}
