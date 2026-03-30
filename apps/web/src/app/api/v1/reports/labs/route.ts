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

    const labSubRequests = await prisma.subRequest.groupBy({
      by: ['laboratoryId'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    });

    const labIds = labSubRequests.map(
      (l: { laboratoryId: string; _count: { id: number } }) => l.laboratoryId,
    );

    // Run independent queries in parallel
    const [labs, completedSubs, labIssues, labTests] = await Promise.all([
      prisma.laboratory.findMany({
        where: { id: { in: labIds } },
        select: { id: true, name: true, code: true },
      }),
      prisma.subRequest.findMany({
        where: {
          createdAt: { gte: since },
          testingStartedAt: { not: null },
          testingCompletedAt: { not: null },
        },
        select: {
          laboratoryId: true,
          testingStartedAt: true,
          testingCompletedAt: true,
        },
      }),
      prisma.sampleIssue.groupBy({
        by: ['subRequestId'],
        where: { createdAt: { gte: since } },
      }),
      // SLA data: lab-specific TAT promises
      prisma.labTest.findMany({
        where: { laboratoryId: { in: labIds } },
        select: { laboratoryId: true, labTatDays: true },
      }),
    ]);

    const labMap = new Map(labs.map((l) => [l.id, l]));

    // Average testing time per lab
    const labTurnaround: Record<string, number[]> = {};
    for (const sub of completedSubs) {
      if (!sub.testingStartedAt || !sub.testingCompletedAt) continue;
      const hours =
        (sub.testingCompletedAt.getTime() - sub.testingStartedAt.getTime()) / (1000 * 60 * 60);
      if (!labTurnaround[sub.laboratoryId]) labTurnaround[sub.laboratoryId] = [];
      labTurnaround[sub.laboratoryId].push(hours);
    }

    // Issue count per lab
    const issueSubIds = new Set(labIssues.map((i) => i.subRequestId));
    const issueSubs = await prisma.subRequest.findMany({
      where: { id: { in: Array.from(issueSubIds) } },
      select: { laboratoryId: true },
    });
    const issuesByLab: Record<string, number> = {};
    for (const sub of issueSubs) {
      issuesByLab[sub.laboratoryId] = (issuesByLab[sub.laboratoryId] ?? 0) + 1;
    }

    const labMetrics = labSubRequests.map(
      (ls: { laboratoryId: string; _count: { id: number } }) => {
        const lab = labMap.get(ls.laboratoryId);
        const turnaroundHours = labTurnaround[ls.laboratoryId] ?? [];
        const avgTurnaround =
          turnaroundHours.length > 0
            ? Math.round(
                (turnaroundHours.reduce((a: number, b: number) => a + b, 0) /
                  turnaroundHours.length) *
                  10,
              ) / 10
            : null;

        // SLA: avg promised TAT in hours
        const labTatEntries = labTests.filter(
          (lt: { laboratoryId: string; labTatDays: number | null }) =>
            lt.laboratoryId === ls.laboratoryId && lt.labTatDays != null,
        );
        const avgSlaDays =
          labTatEntries.length > 0
            ? labTatEntries.reduce(
                (sum: number, lt: { labTatDays: number | null }) => sum + (lt.labTatDays ?? 0),
                0,
              ) / labTatEntries.length
            : null;
        const avgSlaHours = avgSlaDays != null ? Math.round(avgSlaDays * 24 * 10) / 10 : null;
        const slaCompliancePercent =
          avgTurnaround != null && avgSlaHours != null && turnaroundHours.length > 0
            ? Math.round(
                (turnaroundHours.filter((h: number) => h <= avgSlaHours).length /
                  turnaroundHours.length) *
                  100 *
                  10,
              ) / 10
            : null;

        return {
          labId: ls.laboratoryId,
          labName: lab?.name ?? 'Unknown',
          labCode: lab?.code ?? '',
          subRequestCount: ls._count.id,
          avgTurnaroundHours: avgTurnaround,
          avgSlaHours,
          slaCompliancePercent,
          issueCount: issuesByLab[ls.laboratoryId] ?? 0,
        };
      },
    );

    return NextResponse.json({
      labs: labMetrics.sort(
        (a: { subRequestCount: number }, b: { subRequestCount: number }) =>
          b.subRequestCount - a.subRequestCount,
      ),
      period: { days, since: since.toISOString() },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    logger.error({ error }, 'reports.labs.fetch.failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
