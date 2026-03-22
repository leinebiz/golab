import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { REQUEST_STATUS_LABELS, STATUS_COLORS } from '@golab/shared';

export const dynamic = 'force-dynamic';

const BADGE_VARIANT_MAP: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'gray' | 'outline'
> = {
  blue: 'default',
  green: 'success',
  yellow: 'warning',
  orange: 'warning',
  red: 'destructive',
  gray: 'gray',
};

function statusBadgeVariant(status: string) {
  const color = STATUS_COLORS[status] ?? 'gray';
  return BADGE_VARIANT_MAP[color] ?? 'secondary';
}

async function getCustomerData(organizationId: string) {
  const [
    organization,
    activeRequests,
    pendingResults,
    certificatesAvailable,
    outstandingInvoices,
    recentRequests,
  ] = await Promise.all([
    prisma.organization
      .findUnique({
        where: { id: organizationId },
        select: { name: true },
      })
      .catch(() => null),
    prisma.request
      .count({
        where: {
          organizationId,
          status: { notIn: ['CLOSED', 'CANCELLED'] },
        },
      })
      .catch(() => 0),
    prisma.subRequest
      .count({
        where: {
          request: { organizationId },
          status: {
            in: [
              'TESTING_SCHEDULED',
              'TESTING_IN_PROGRESS',
              'TESTING_DELAYED',
              'TESTING_COMPLETED',
              'AWAITING_GOLAB_REVIEW',
            ],
          },
        },
      })
      .catch(() => 0),
    prisma.subRequest
      .count({
        where: {
          request: { organizationId },
          status: { in: ['APPROVED_FOR_RELEASE', 'RELEASED_TO_CUSTOMER'] },
        },
      })
      .catch(() => 0),
    prisma.invoice
      .count({
        where: {
          request: { organizationId },
          status: { in: ['ISSUED', 'OVERDUE'] },
        },
      })
      .catch(() => 0),
    prisma.request
      .findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          reference: true,
          status: true,
          createdAt: true,
          _count: { select: { subRequests: true } },
        },
      })
      .catch(
        () =>
          [] as {
            id: string;
            reference: string;
            status: string;
            createdAt: Date;
            _count: { subRequests: number };
          }[],
      ),
  ]);

  return {
    organization,
    activeRequests,
    pendingResults,
    certificatesAvailable,
    outstandingInvoices,
    recentRequests,
  };
}

export default async function CustomerDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const organizationId = (session.user as Record<string, unknown>).organizationId as
    | string
    | undefined;
  if (!organizationId) {
    redirect('/login');
  }

  const data = await getCustomerData(organizationId);

  const kpiCards = [
    {
      title: 'Active Requests',
      value: data.activeRequests,
      description: 'Requests in progress',
    },
    {
      title: 'Pending Results',
      value: data.pendingResults,
      description: 'Samples being tested',
    },
    {
      title: 'Certificates Available',
      value: data.certificatesAvailable,
      description: 'Ready for download',
    },
    {
      title: 'Outstanding Invoices',
      value: data.outstandingInvoices,
      description: 'Awaiting payment',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Welcome back, {data.organization?.name ?? 'Customer'}
        </h1>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
              <p className="text-xs text-gray-500 mt-1">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/customer/requests/new">New Request</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/customer/certificates">View Certificates</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/customer/finances">View Invoices</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentRequests.length === 0 ? (
            <p className="text-sm text-gray-500">
              No requests yet.{' '}
              <Link href="/customer/requests/new" className="text-blue-600 hover:underline">
                Create your first request
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {data.recentRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/customer/requests/${request.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{request.reference}</div>
                    <div className="text-xs text-gray-500">
                      {request.createdAt.toLocaleDateString()} &middot; {request._count.subRequests}{' '}
                      sub-request
                      {request._count.subRequests !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <Badge variant={statusBadgeVariant(request.status)}>
                    {REQUEST_STATUS_LABELS[request.status] ?? request.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
