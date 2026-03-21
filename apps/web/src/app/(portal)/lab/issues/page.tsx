import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogIssueForm } from './log-issue-form';

export const dynamic = 'force-dynamic';

async function getLabSubRequests() {
  return prisma.subRequest.findMany({
    where: {
      status: {
        in: ['SAMPLE_ACCEPTED_BY_LAB', 'TESTING_SCHEDULED', 'TESTING_IN_PROGRESS'],
      },
    },
    select: {
      id: true,
      subReference: true,
      status: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

interface OpenIssue {
  id: string;
  issueType: string;
  comments: string;
  createdAt: Date;
  subReference: string;
}

async function getOpenIssues(): Promise<OpenIssue[]> {
  const rows = await prisma.sampleIssue.findMany({
    where: { resolvedAt: null },
    include: {
      subRequest: {
        select: { subReference: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const items: OpenIssue[] = [];
  for (const issue of rows) {
    items.push({
      id: issue.id,
      issueType: issue.issueType,
      comments: issue.comments,
      createdAt: issue.createdAt,
      subReference: issue.subRequest.subReference,
    });
  }
  return items;
}

const ISSUE_TYPE_LABELS: Record<string, string> = {
  INSUFFICIENT_SAMPLE: 'Insufficient Sample',
  SAMPLE_DAMAGED: 'Sample Damaged',
  INCORRECT_TEST_CHOSEN: 'Incorrect Test Chosen',
  INCORRECT_PACKAGING: 'Incorrect Packaging',
  OTHER: 'Other',
};

export default async function LabIssuesPage() {
  const [subRequests, openIssues] = await Promise.all([getLabSubRequests(), getOpenIssues()]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sample Issues</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Log New Issue</h2>
          <LogIssueForm subRequests={subRequests} />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Open Issues</h2>
            <Badge variant="destructive">{openIssues.length}</Badge>
          </div>
          {openIssues.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">No open issues.</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {openIssues.map((issue: OpenIssue) => (
                <Card key={issue.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium">{issue.subReference}</CardTitle>
                      <Badge variant="warning">
                        {ISSUE_TYPE_LABELS[issue.issueType] ?? issue.issueType}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">{issue.comments}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(issue.createdAt).toLocaleString('en-ZA')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
