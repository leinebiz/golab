import Link from 'next/link';
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { prisma } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CustomerFilters } from './customer-filters';

type CreditStatus = 'NOT_APPLIED' | 'PENDING_REVIEW' | 'APPROVED' | 'DECLINED' | 'SUSPENDED';

const PAGE_SIZE = 20;

function creditStatusBadge(status: CreditStatus | undefined) {
  if (!status) return <Badge variant="gray">No account</Badge>;
  const map: Record<CreditStatus, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'gray' }> = {
    NOT_APPLIED: { label: 'Not applied', variant: 'gray' },
    PENDING_REVIEW: { label: 'Pending', variant: 'warning' },
    APPROVED: { label: 'Approved', variant: 'success' },
    DECLINED: { label: 'Declined', variant: 'destructive' },
    SUSPENDED: { label: 'Suspended', variant: 'destructive' },
  };
  const entry = map[status];
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const search = typeof params.search === 'string' ? params.search : '';
  const page = Math.max(1, Number(params.page) || 1);
  const paymentFilter = typeof params.payment === 'string' ? params.payment : 'all';

  // Build where clause
  const where = {
    type: 'CUSTOMER' as const,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { registrationNumber: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(paymentFilter !== 'all' ? { paymentType: paymentFilter as 'CREDIT' | 'COD' } : {}),
  };

  const includeClause = {
    users: {
      take: 1,
      orderBy: { createdAt: 'asc' as const },
      select: { email: true, name: true },
    },
    creditAccount: {
      select: { status: true },
    },
    _count: {
      select: { requests: true },
    },
  };

  const [customers, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      include: includeClause,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.organization.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildUrl(overrides: Record<string, string | number>) {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (paymentFilter !== 'all') p.set('payment', paymentFilter);
    p.set('page', String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === '' || v === 'all') {
        p.delete(k);
      } else {
        p.set(k, String(v));
      }
    }
    const qs = p.toString();
    return qs ? `?${qs}` : '/admin/customers';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-sm text-gray-500">
          Manage customer organizations, credit accounts, and payment settings
        </p>
      </div>

      {/* Filters — client component for interactivity */}
      <CustomerFilters
        currentSearch={search}
        currentPayment={paymentFilter}
      />

      {/* Desktop table */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Reg. Number</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Credit Status</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="h-8 w-8 text-gray-300" />
                        <p>No customers found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow key={customer.id} className="cursor-pointer">
                      <TableCell>
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {customer.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {customer.registrationNumber ?? '—'}
                      </TableCell>
                      <TableCell>
                        {customer.users[0] ? (
                          <div className="text-sm">
                            <div>{customer.users[0].name}</div>
                            <div className="text-gray-500">{customer.users[0].email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">No users</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.paymentType === 'CREDIT' ? 'default' : 'secondary'}>
                          {customer.paymentType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {creditStatusBadge(customer.creditAccount?.status)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {customer._count.requests}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {formatDate(customer.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {customers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-gray-500">
            <Building2 className="h-8 w-8 text-gray-300" />
            <p>No customers found</p>
          </div>
        ) : (
          customers.map((customer) => (
            <Link key={customer.id} href={`/admin/customers/${customer.id}`}>
              <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{customer.name}</span>
                    {creditStatusBadge(customer.creditAccount?.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Reg:</span>{' '}
                      {customer.registrationNumber ?? '—'}
                    </div>
                    <div>
                      <span className="font-medium">Requests:</span>{' '}
                      {customer._count.requests}
                    </div>
                    <div>
                      <span className="font-medium">Payment:</span>{' '}
                      {customer.paymentType}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>{' '}
                      {formatDate(customer.createdAt)}
                    </div>
                  </div>
                  {customer.users[0] && (
                    <div className="mt-2 text-xs text-gray-500">
                      {customer.users[0].name} &middot; {customer.users[0].email}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * PAGE_SIZE + 1} to{' '}
            {Math.min(page * PAGE_SIZE, total)} of {total} customers
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={buildUrl({ page: page - 1 })}>
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
            <span className="flex items-center px-3 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={buildUrl({ page: page + 1 })}>
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
