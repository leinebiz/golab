import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SUB_REQUEST_STATUS_LABELS } from '@golab/shared';

export const dynamic = 'force-dynamic';

async function getLabKpis() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [incoming, inProgress, completedToday, openIssues] = await Promise.all([
    prisma.subRequest.count({
      where: { status: 'DELIVERED_TO_LAB' },
    }),
    prisma.subRequest.count({
      where: {
        status: {
          in: [
            'SAMPLE_ACCEPTED_BY_LAB',
            'TESTING_SCHEDULED',
            'TESTING_IN_PROGRESS',
            'TESTING_DELAYED',
          ],
        },
      },
    }),
    prisma.subRequest.count({
      where: {
        status: 'TESTING_COMPLETED',
        testingCompletedAt: { gte: today },
      },
    }),
    prisma.sampleIssue.count({
      where: { resolvedAt: null },
    }),
  ]);

  return { incoming, inProgress, completedToday, openIssues };
}

export default async function LabDashboardPage() {
  const kpis = await getLabKpis();

  const cards = [
    {
      title: 'Incoming Samples',
      value: kpis.incoming,
      description: SUB_REQUEST_STATUS_LABELS.DELIVERED_TO_LAB,
      href: '/lab/incoming',
    },
    {
      title: 'In Progress',
      value: kpis.inProgress,
      description: 'Samples being tested',
      href: '/lab/in-progress',
    },
    {
      title: 'Completed Today',
      value: kpis.completedToday,
      description: 'Tests finished today',
      href: '/lab/upload',
    },
    {
      title: 'Open Issues',
      value: kpis.openIssues,
      description: 'Unresolved sample issues',
      href: '/lab/issues',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Lab Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <a key={card.title} href={card.href} className="block">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">{card.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
                <p className="text-xs text-gray-500 mt-1">{card.description}</p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
