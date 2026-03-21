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

    const labs = await prisma.laboratory.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
    });

    const labPerformance = await Promise.all(
      labs.map(async (lab) => {
        const subRequests = await prisma.subRequest.findMany({
          where: { laboratoryId: lab.id, createdAt: { gte: from, lte: to } },
          select: {
            id: true,
            status: true,
            createdAt: true,
            testingCompletedAt: true,
            expectedCompletionAt: true,
            delayReason: true,
          },
        });
        const total = subRequests.length;
        const completed = subRequests.filter((sr) =>
          ['TESTING_COMPLETED', 'APPROVED_FOR_RELEASE', 'RELEASED_TO_CUSTOMER'].includes(sr.status),
        ).length;
        const rejected = subRequests.filter((sr) => sr.status === 'SAMPLE_REJECTED').length;
        const delayed = subRequests.filter((sr) => sr.delayReason !== null).length;

        const tatDays: number[] = [];
        const slaDays: number[] = [];
        for (const sr of subRequests) {
          if (sr.testingCompletedAt)
            tatDays.push((sr.testingCompletedAt.getTime() - sr.createdAt.getTime()) / 86400000);
          if (sr.expectedCompletionAt)
            slaDays.push((sr.expectedCompletionAt.getTime() - sr.createdAt.getTime()) / 86400000);
        }
        const avgTat = tatDays.length > 0 ? tatDays.reduce((a, b) => a + b, 0) / tatDays.length : 0;
        const avgSla = slaDays.length > 0 ? slaDays.reduce((a, b) => a + b, 0) / slaDays.length : 0;

        return {
          labId: lab.id,
          labName: lab.name,
          labCode: lab.code,
          total,
          completed,
          rejected,
          delayed,
          completionRate: total > 0 ? Math.round((completed / total) * 1000) / 10 : 0,
          rejectionRate: total > 0 ? Math.round((rejected / total) * 1000) / 10 : 0,
          delayFrequency: total > 0 ? Math.round((delayed / total) * 1000) / 10 : 0,
          avgTatDays: Math.round(avgTat * 10) / 10,
          avgSlaDays: Math.round(avgSla * 10) / 10,
        };
      }),
    );

    return NextResponse.json({
      labs: labPerformance,
      dateRange: { from: from.toISOString(), to: to.toISOString() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'reports.labs.failed');
    if (message === 'Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
