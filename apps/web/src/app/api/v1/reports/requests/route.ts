import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const days = parseInt(searchParams.get('days') ?? '30', 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Status distribution
    const statusCounts = await prisma.request.groupBy({
      by: ['status'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    });

    // Daily volume trend
    const requests = await prisma.request.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const volumeByDay: Record<string, number> = {};
    for (const r of requests) {
      const day = r.createdAt.toISOString().split('T')[0];
      volumeByDay[day] = (volumeByDay[day] ?? 0) + 1;
    }
    const volumeTrend = Object.entries(volumeByDay).map(([date, count]) => ({ date, count }));

    // Conversion funnel
    const [totalCreated, withQuote, accepted, paid, completed] = await Promise.all([
      prisma.request.count({ where: { createdAt: { gte: since } } }),
      prisma.request.count({
        where: { createdAt: { gte: since }, quote: { isNot: null } },
      }),
      prisma.request.count({
        where: { createdAt: { gte: since }, quote: { isAccepted: true } },
      }),
      prisma.request.count({
        where: { createdAt: { gte: since }, invoice: { status: 'PAID' } },
      }),
      prisma.request.count({
        where: { createdAt: { gte: since }, status: 'CLOSED' },
      }),
    ]);

    const funnel = [
      { name: 'Requests', value: totalCreated },
      { name: 'Quoted', value: withQuote },
      { name: 'Accepted', value: accepted },
      { name: 'Paid', value: paid },
      { name: 'Completed', value: completed },
    ];

    // Average turnaround by stage
    const transitions = await prisma.statusTransition.findMany({
      where: {
        requestId: { not: null },
        createdAt: { gte: since },
        toStatus: {
          in: [
            'QUOTE_CALCULATED',
            'ACCEPTED_BY_CUSTOMER',
            'PAYMENT_RECEIVED',
            'IN_PROGRESS',
            'CLOSED',
          ],
        },
      },
      select: {
        toStatus: true,
        createdAt: true,
        request: { select: { createdAt: true } },
      },
    });

    const turnaroundByStage: Record<string, number[]> = {};
    for (const t of transitions) {
      if (!t.request) continue;
      const hours = (t.createdAt.getTime() - t.request.createdAt.getTime()) / (1000 * 60 * 60);
      if (!turnaroundByStage[t.toStatus]) turnaroundByStage[t.toStatus] = [];
      turnaroundByStage[t.toStatus].push(hours);
    }

    const avgTurnaround = Object.entries(turnaroundByStage).map(([stage, hours]) => ({
      stage,
      avgHours: Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10,
    }));

    return NextResponse.json({
      statusDistribution: statusCounts.map((s: { status: string; _count: { id: number } }) => ({
        status: s.status,
        count: s._count.id,
      })),
      volumeTrend,
      funnel,
      avgTurnaround,
      period: { days, since: since.toISOString() },
    });
  } catch (error) {
    console.error('Failed to fetch request analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
