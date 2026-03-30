import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type CreditStatus = 'NOT_APPLIED' | 'PENDING_REVIEW' | 'APPROVED' | 'DECLINED' | 'SUSPENDED';

function creditStatusBadge(status: CreditStatus) {
  const map: Record<
    CreditStatus,
    { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'gray' }
  > = {
    NOT_APPLIED: { label: 'Not applied', variant: 'gray' },
    PENDING_REVIEW: { label: 'Pending', variant: 'warning' },
    APPROVED: { label: 'Approved', variant: 'success' },
    DECLINED: { label: 'Declined', variant: 'destructive' },
    SUSPENDED: { label: 'Suspended', variant: 'destructive' },
  };
  const entry = map[status];
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

function requestStatusBadge(status: string) {
  const map: Record<
    string,
    'success' | 'warning' | 'destructive' | 'secondary' | 'gray' | 'default'
  > = {
    DRAFT: 'gray',
    SUBMITTED: 'default',
    IN_REVIEW: 'warning',
    APPROVED: 'success',
    IN_PROGRESS: 'warning',
    COMPLETED: 'success',
    CANCELLED: 'destructive',
    REJECTED: 'destructive',
  };
  return <Badge variant={map[status] ?? 'secondary'}>{status.replace(/_/g, ' ')}</Badge>;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return 'R 0.00';
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface RouteProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: RouteProps) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  const role = (session.user as unknown as Record<string, unknown>).role as string;
  const adminRoles = ['GOLAB_ADMIN', 'GOLAB_REVIEWER', 'GOLAB_FINANCE'];
  if (!adminRoles.includes(role)) {
    redirect('/login');
  }

  const { id } = await params;

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      addresses: { orderBy: { createdAt: 'desc' } },
      creditAccount: true,
      requests: {
        select: {
          id: true,
          reference: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      _count: { select: { requests: true } },
    },
  });

  if (!org) {
    notFound();
  }

  const activeRequests = org.requests.filter(
    (r) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(r.status),
  ).length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/customers" className="hover:text-gray-700 hover:underline">
          Customers
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{org.name}</span>
      </nav>

      {/* Org header */}
      <div>
        <h1 className="text-2xl font-bold">{org.name}</h1>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
          {org.type && (
            <span>
              <span className="font-medium">Type:</span> {org.type}
            </span>
          )}
          {org.registrationNumber && (
            <span>
              <span className="font-medium">Reg:</span> {org.registrationNumber}
            </span>
          )}
          {org.vatNumber && (
            <span>
              <span className="font-medium">VAT:</span> {org.vatNumber}
            </span>
          )}
          {org.industry && (
            <span>
              <span className="font-medium">Industry:</span> {org.industry}
            </span>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Requests</p>
            <p className="text-2xl font-bold tabular-nums">{org._count.requests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Active Requests</p>
            <p className="text-2xl font-bold tabular-nums">{activeRequests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-2xl font-bold tabular-nums">{org.users.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Credit account */}
      {org.creditAccount && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Credit Account</span>
              {creditStatusBadge(org.creditAccount.status as CreditStatus)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Credit Limit</span>
                <p className="font-medium">
                  {formatCurrency(Number(org.creditAccount.creditLimit))}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Available Credit</span>
                <p className="font-medium">
                  {formatCurrency(Number(org.creditAccount.availableCredit))}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Application Date</span>
                <p className="font-medium">{formatDate(org.creditAccount.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({org.users.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {org.users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                    No users
                  </TableCell>
                </TableRow>
              ) : (
                org.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name ?? '—'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'success' : 'destructive'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Addresses */}
      <Card>
        <CardHeader>
          <CardTitle>Addresses ({org.addresses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {org.addresses.length === 0 ? (
            <p className="text-sm text-gray-500">No addresses on file</p>
          ) : (
            <div className="space-y-4">
              {org.addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="flex items-start justify-between border rounded-lg p-4"
                >
                  <div className="text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">{addr.type}</Badge>
                      {addr.isDefault && <Badge variant="default">Default</Badge>}
                    </div>
                    <p>{addr.line1}</p>
                    {addr.line2 && <p>{addr.line2}</p>}
                    <p>
                      {addr.city}, {addr.province} {addr.postalCode}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {org.requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-gray-500">
                    No requests
                  </TableCell>
                </TableRow>
              ) : (
                org.requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <Link
                        href={`/admin/requests/${req.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {req.reference}
                      </Link>
                    </TableCell>
                    <TableCell>{requestStatusBadge(req.status)}</TableCell>
                    <TableCell className="text-gray-600">{formatDate(req.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
