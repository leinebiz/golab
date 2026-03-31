import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
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
    const [labs, completedSubs, labIssues] = await Promise.all([
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
    const issueSubIds = labIssues
      .map((i) => i.subRequestId)
      .filter((id): id is string => id != null);
    const issueSubs = await prisma.subRequest.findMany({
      where: { id: { in: issueSubIds } },
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

        return {
          labId: ls.laboratoryId,
          labName: lab?.name ?? 'Unknown',
          labCode: lab?.code ?? '',
          subRequestCount: ls._count.id,
          avgTurnaroundHours: avgTurnaround,
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
  } catch (error) {
    console.error('Failed to fetch lab metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
