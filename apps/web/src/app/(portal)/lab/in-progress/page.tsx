import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SUB_REQUEST_STATUS_LABELS } from '@golab/shared';
import { InProgressActions } from './in-progress-actions';

export const dynamic = 'force-dynamic';

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'warning' | 'success'> = {
  SAMPLE_ACCEPTED_BY_LAB: 'default',
  TESTING_SCHEDULED: 'default',
  TESTING_IN_PROGRESS: 'default',
  TESTING_DELAYED: 'warning',
  TESTING_COMPLETED: 'success',
};

interface InProgressItem {
  id: string;
  subReference: string;
  status: string;
  expectedCompletionAt: Date | null;
  delayReason: string | null;
  customerName: string;
  testNames: string;
}

async function getInProgressSubRequests(): Promise<InProgressItem[]> {
  const rows = await prisma.subRequest.findMany({
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
    include: {
      request: {
        include: {
          organization: { select: { name: true } },
        },
      },
      tests: {
        include: {
          testCatalogue: { select: { name: true } },
        },
      },
    },
    orderBy: [{ expectedCompletionAt: 'asc' }, { createdAt: 'asc' }],
  });

  const items: InProgressItem[] = [];
  for (const sr of rows) {
    items.push({
      id: sr.id,
      subReference: sr.subReference,
      status: sr.status,
      expectedCompletionAt: sr.expectedCompletionAt,
      delayReason: sr.delayReason,
      customerName: sr.request.organization.name,
      testNames: sr.tests
        .map((t: { testCatalogue: { name: string } }) => t.testCatalogue.name)
        .join(', '),
    });
  }
  return items;
}

export default async function LabInProgressPage() {
  const subRequests = await getInProgressSubRequests();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">In Progress</h1>
        <Badge variant="secondary">{subRequests.length} active</Badge>
      </div>

      {subRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No samples currently in progress.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subRequests.map((sr: InProgressItem) => (
            <Card key={sr.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{sr.subReference}</CardTitle>
                    <p className="text-sm text-gray-500">{sr.customerName}</p>
                  </div>
                  <Badge variant={STATUS_BADGE_VARIANT[sr.status] ?? 'default'}>
                    {SUB_REQUEST_STATUS_LABELS[sr.status] ?? sr.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Tests</p>
                    <p className="text-sm">{sr.testNames}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">ETA</p>
                    <p className="text-sm">
                      {sr.expectedCompletionAt
                        ? new Date(sr.expectedCompletionAt).toLocaleDateString('en-ZA', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Not set'}
                    </p>
                  </div>
                  {sr.delayReason && (
                    <div>
                      <p className="text-xs font-medium text-red-500 uppercase">Delay Reason</p>
                      <p className="text-sm text-red-600">{sr.delayReason}</p>
                    </div>
                  )}
                </div>
                <InProgressActions
                  subRequestId={sr.id}
                  currentStatus={sr.status}
                  currentEta={sr.expectedCompletionAt?.toISOString() ?? null}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
