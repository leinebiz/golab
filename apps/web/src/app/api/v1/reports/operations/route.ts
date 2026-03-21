import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@golab/database';
import { requirePermission } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('reports', 'read');

    const { searchParams } = request.nextUrl;
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const to = toParam ? new Date(toParam) : new Date();
    const from = fromParam
      ? new Date(fromParam)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    const statusCounts = await prisma.request.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { createdAt: { gte: from, lte: to } },
    });
    const byStatus = statusCounts.map((s) => ({ name: s.status, value: s._count.id }));

    const allRequests = await prisma.request.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const volumeByDay: Record<string, number> = {};
    for (const r of allRequests) {
      const day = r.createdAt.toISOString().slice(0, 10);
      volumeByDay[day] = (volumeByDay[day] ?? 0) + 1;
    }
    const volumeTrend = Object.entries(volumeByDay).map(([date, count]) => ({ date, count }));

    const totalRequests = await prisma.request.count({
      where: { createdAt: { gte: from, lte: to } },
    });
    const quoted = await prisma.request.count({
      where: { createdAt: { gte: from, lte: to }, quote: { isNot: null } },
    });
    const accepted = await prisma.request.count({
      where: { createdAt: { gte: from, lte: to }, acceptedAt: { not: null } },
    });
    const completed = await prisma.request.count({
      where: { createdAt: { gte: from, lte: to }, status: 'CLOSED' },
    });

    const funnel = [
      { name: 'Submitted', value: totalRequests },
      { name: 'Quoted', value: quoted },
      { name: 'Accepted', value: accepted },
      { name: 'Completed', value: completed },
    ];

    const transitions = await prisma.statusTransition.findMany({
      where: { requestId: { not: null }, createdAt: { gte: from, lte: to } },
      select: { requestId: true, fromStatus: true, toStatus: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const stageLabels = [
      { from: 'DRAFT', to: 'QUOTE_CALCULATED', label: 'Draft to Quote' },
      { from: 'QUOTE_CALCULATED', to: 'ACCEPTED_BY_CUSTOMER', label: 'Quote to Accepted' },
      { from: 'ACCEPTED_BY_CUSTOMER', to: 'IN_PROGRESS', label: 'Accepted to In Progress' },
      { from: 'IN_PROGRESS', to: 'CLOSED', label: 'In Progress to Closed' },
    ];

    const byRequest = new Map<
      string,
      Array<{ fromStatus: string; toStatus: string; createdAt: Date }>
    >();
    for (const t of transitions) {
      if (!t.requestId) continue;
      const list = byRequest.get(t.requestId) ?? [];
      list.push({ fromStatus: t.fromStatus, toStatus: t.toStatus, createdAt: t.createdAt });
      byRequest.set(t.requestId, list);
    }

    const turnaroundByStage = stageLabels.map((stage) => {
      const durations: number[] = [];
      for (const [, transList] of byRequest) {
        const fromT = transList.find(
          (t) => t.toStatus === stage.from || t.fromStatus === stage.from,
        );
        const toT = transList.find((t) => t.toStatus === stage.to && t.fromStatus === stage.from);
        if (fromT && toT) {
          const days =
            (toT.createdAt.getTime() - fromT.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          if (days >= 0) durations.push(days);
        }
      }
      const avg =
        durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
      return { stage: stage.label, avgDays: Math.round(avg * 10) / 10 };
    });

    const previousFrom = new Date(from.getTime() - (to.getTime() - from.getTime()));
    const previousTotal = await prisma.request.count({
      where: { createdAt: { gte: previousFrom, lte: from } },
    });
    const volumeChange =
      previousTotal > 0 ? ((totalRequests - previousTotal) / previousTotal) * 100 : 0;
    const conversionRate = totalRequests > 0 ? (completed / totalRequests) * 100 : 0;

    return NextResponse.json({
      kpis: {
        totalRequests,
        conversionRate: Math.round(conversionRate * 10) / 10,
        volumeChange: Math.round(volumeChange * 10) / 10,
      },
      byStatus,
      volumeTrend,
      funnel,
      turnaroundByStage,
      dateRange: { from: from.toISOString(), to: to.toISOString() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'reports.operations.failed');
    if (message === 'Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
