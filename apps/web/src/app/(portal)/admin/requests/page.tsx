import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { RequestStatus } from '@golab/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/request/status-badge';
import { RequestsSearchForm } from './search-form';

const STATUS_TABS = [
  { label: 'All', value: 'all', statuses: [] as RequestStatus[] },
  { label: 'Draft', value: 'draft', statuses: [RequestStatus.DRAFT] },
  {
    label: 'Quoted',
    value: 'quoted',
    statuses: [RequestStatus.QUOTE_CALCULATED, RequestStatus.PENDING_CUSTOMER_REVIEW],
  },
  {
    label: 'In Progress',
    value: 'in-progress',
    statuses: [
      RequestStatus.ACCEPTED_BY_CUSTOMER,
      RequestStatus.INVOICE_GENERATED,
      RequestStatus.AWAITING_COD_PAYMENT,
      RequestStatus.PAYMENT_RECEIVED,
      RequestStatus.CREDIT_APPROVED_FOR_REQUEST,
      RequestStatus.IN_PROGRESS,
      RequestStatus.PENDING_CUSTOMER_ACTION,
      RequestStatus.ON_HOLD,
    ],
  },
  {
    label: 'Completed',
    value: 'completed',
    statuses: [RequestStatus.CLOSED, RequestStatus.CANCELLED],
  },
] as const;

const PAGE_SIZE = 20;

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const role = (session.user as unknown as Record<string, unknown>).role as string;
  const adminRoles = ['GOLAB_ADMIN', 'GOLAB_REVIEWER', 'GOLAB_FINANCE'];
  if (!adminRoles.includes(role)) {
    redirect('/login');
  }

  const params = await searchParams;
  const tab = (typeof params.tab === 'string' ? params.tab : 'all') as string;
  const search = typeof params.search === 'string' ? params.search : '';
  const page = Math.max(1, Number(params.page) || 1);

  const activeTab = STATUS_TABS.find((t) => t.value === tab) ?? STATUS_TABS[0];

  const where: Record<string, unknown> = {};

  if (activeTab.statuses.length > 0) {
    where.status = { in: activeTab.statuses };
  }

  if (search) {
    where.OR = [
      { reference: { contains: search, mode: 'insensitive' } },
      { organization: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [requests, total] = await Promise.all([
    prisma.request.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true } },
        subRequests: {
          select: {
            id: true,
            laboratory: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.request.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {};
    if (tab !== 'all') base.tab = tab;
    if (search) base.search = search;
    if (page > 1) base.page = String(page);

    const merged = { ...base, ...overrides };
    // Remove empty/undefined values
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== '' && v !== 'all' && v !== '1') {
        cleaned[k] = v;
      }
    }
    const qs = new URLSearchParams(cleaned).toString();
    return `/admin/requests${qs ? `?${qs}` : ''}`;
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function uniqueLabs(
    subRequests: Array<{ laboratory: { id: string; name: string; code: string } }>,
  ) {
    const seen = new Map<string, string>();
    for (const sr of subRequests) {
      if (!seen.has(sr.laboratory.id)) {
        seen.set(sr.laboratory.id, sr.laboratory.name);
      }
    }
    return Array.from(seen.values());
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Requests</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage and review all customer requests across the platform.
        </p>
      </div>

      {/* Status Tabs */}
      <div className="inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500">
        {STATUS_TABS.map((t) => (
          <Link
            key={t.value}
            href={buildUrl({ tab: t.value, page: undefined })}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
              activeTab.value === t.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'hover:text-gray-900'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Search */}
      <RequestsSearchForm currentSearch={search} tab={tab} />

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lab(s)</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => {
                    const labs = uniqueLabs(request.subRequests);
                    return (
                      <TableRow key={request.id} className="hover:bg-gray-50">
                        <TableCell>
                          <Link
                            href={`/admin/requests/${request.id}`}
                            className="font-mono text-sm text-blue-600 hover:underline"
                          >
                            {request.reference}
                          </Link>
                        </TableCell>
                        <TableCell>{request.organization.name}</TableCell>
                        <TableCell>
                          <StatusBadge status={request.status} type="request" />
                        </TableCell>
                        <TableCell>
                          {labs.length > 0 ? (
                            <span className="text-sm text-gray-600">{labs.join(', ')}</span>
                          ) : (
                            <span className="text-sm text-gray-400">--</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(request.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(request.updatedAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {requests.length === 0 ? (
          <p className="text-center py-8 text-gray-500">No requests found</p>
        ) : (
          requests.map((request) => {
            const labs = uniqueLabs(request.subRequests);
            return (
              <Link key={request.id} href={`/admin/requests/${request.id}`}>
                <Card className="hover:bg-gray-50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-medium">{request.reference}</span>
                      <StatusBadge status={request.status} type="request" />
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Customer:</span> {request.organization.name}
                      </div>
                      <div>
                        <span className="font-medium">Lab(s):</span>{' '}
                        {labs.length > 0 ? labs.join(', ') : '--'}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>{' '}
                        {formatDate(request.createdAt)}
                      </div>
                      <div>
                        <span className="font-medium">Updated:</span>{' '}
                        {formatDate(request.updatedAt)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total}{' '}
            requests
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={buildUrl({ page: String(page - 1) })}>
                <Button variant="outline" size="sm">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            )}
            {page < totalPages ? (
              <Link href={buildUrl({ page: String(page + 1) })}>
                <Button variant="outline" size="sm">
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
