import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ChevronRight,
  Building2,
  FlaskConical,
  FileCheck,
  Truck,
  AlertTriangle,
} from 'lucide-react';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/request/status-badge';
import { REQUEST_STATUS_LABELS } from '@golab/shared';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(date: Date): string {
  return date.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(amount: unknown): string {
  const num = Number(amount);
  if (isNaN(num)) return 'R 0.00';
  return `R ${num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const { id } = await params;

  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      organization: { select: { id: true, name: true } },
      subRequests: {
        include: {
          laboratory: { select: { id: true, name: true, code: true } },
          tests: { include: { testCatalogue: { select: { name: true, code: true } } } },
          certificates: {
            select: {
              id: true,
              fileName: true,
              format: true,
              releasedAt: true,
              reviewAction: true,
            },
          },
          waybill: {
            select: { id: true, waybillNumber: true, status: true },
          },
          sampleIssues: {
            select: {
              id: true,
              issueType: true,
              comments: true,
              resolution: true,
              resolvedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      quote: {
        select: {
          id: true,
          quoteNumber: true,
          totalAmount: true,
          isAccepted: true,
          expiresAt: true,
        },
      },
      invoice: {
        select: { id: true, invoiceNumber: true, totalAmount: true, status: true },
      },
      statusTransitions: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });

  if (!request) {
    notFound();
  }

  const statusLabels: Record<string, string> = REQUEST_STATUS_LABELS;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/admin/requests" className="hover:text-foreground">
          Requests
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{request.reference}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{request.reference}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={request.status} type="request" />
            <span className="text-sm text-muted-foreground">
              {request.turnaroundType === 'EXPEDITED' ? 'Expedited' : 'Standard'} turnaround
            </span>
            <span className="text-sm text-muted-foreground">
              Created {formatDate(request.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Organization */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Organization</p>
              <Link
                href={`/admin/customers/${request.organization.id}`}
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                {request.organization.name}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quote & Invoice summary row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quote */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quote</CardTitle>
          </CardHeader>
          <CardContent>
            {request.quote ? (
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">
                    {formatCurrency(request.quote.totalAmount)}
                  </span>
                  {request.quote.isAccepted === true && <Badge variant="success">Accepted</Badge>}
                  {request.quote.isAccepted === false && (
                    <Badge variant="destructive">Rejected</Badge>
                  )}
                  {request.quote.isAccepted === null && <Badge variant="warning">Pending</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{request.quote.quoteNumber}</p>
                {request.quote.expiresAt && (
                  <p className="text-xs text-muted-foreground">
                    Expires {formatDate(request.quote.expiresAt)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No quote generated yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Invoice */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            {request.invoice ? (
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">
                    {formatCurrency(request.invoice.totalAmount)}
                  </span>
                  <Badge variant={request.invoice.status === 'PAID' ? 'success' : 'warning'}>
                    {request.invoice.status === 'PAID' ? 'Paid' : 'Unpaid'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{request.invoice.invoiceNumber}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No invoice generated yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sub-requests */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Sub-Requests</h2>
          {request.subRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sub-requests created yet.</p>
          ) : (
            request.subRequests.map((sr) => (
              <Card key={sr.id}>
                <CardContent className="p-4 space-y-3">
                  {/* Sub-request header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{sr.subReference}</p>
                      <h4 className="text-base font-semibold">
                        {sr.laboratory.name}{' '}
                        <span className="text-xs text-muted-foreground font-normal">
                          ({sr.laboratory.code})
                        </span>
                      </h4>
                    </div>
                    <StatusBadge status={sr.status} type="subRequest" />
                  </div>

                  {/* Tests */}
                  {sr.tests.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <FlaskConical className="h-3 w-3" />
                        <span>Tests ({sr.tests.length})</span>
                      </div>
                      {sr.tests.map((test) => (
                        <div
                          key={test.id}
                          className="flex items-center justify-between text-sm pl-4"
                        >
                          <span>
                            {test.testCatalogue?.name ?? 'Unknown test'}{' '}
                            {test.testCatalogue?.code && (
                              <span className="text-xs text-muted-foreground">
                                ({test.testCatalogue.code})
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Waybill */}
                  {sr.waybill && (
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span>Waybill: {sr.waybill.waybillNumber}</span>
                      <Badge variant="outline" className="text-xs">
                        {sr.waybill.status}
                      </Badge>
                    </div>
                  )}

                  {/* Certificates */}
                  {sr.certificates.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <FileCheck className="h-3 w-3" />
                        <span>Certificates ({sr.certificates.length})</span>
                      </div>
                      {sr.certificates.map((cert) => (
                        <div key={cert.id} className="flex items-center gap-2 text-sm pl-4">
                          <FileCheck className="h-3 w-3 text-blue-600" />
                          <span>{cert.fileName}</span>
                          {cert.reviewAction && (
                            <Badge variant="outline" className="text-xs">
                              {cert.reviewAction}
                            </Badge>
                          )}
                          {cert.releasedAt && (
                            <span className="text-xs text-muted-foreground">
                              Released {formatDate(cert.releasedAt)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sample Issues */}
                  {sr.sampleIssues.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs font-medium text-orange-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Sample Issues ({sr.sampleIssues.length})</span>
                      </div>
                      {sr.sampleIssues.map((issue) => (
                        <div key={issue.id} className="text-sm pl-4">
                          <span className="font-medium">{issue.issueType}</span>
                          {issue.comments && (
                            <span className="text-muted-foreground"> — {issue.comments}</span>
                          )}
                          <Badge variant="outline" className="ml-2 text-xs">
                            {issue.resolvedAt ? 'Resolved' : 'Open'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Documents */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {request.quote ? (
                <div className="space-y-2">
                  <a
                    href={`/api/v1/quotes/${request.quote.id}/pdf`}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <FileCheck className="h-4 w-4" />
                    Quote — {request.quote.quoteNumber}
                  </a>
                  {request.invoice && (
                    <a
                      href={`/api/v1/invoices/${request.invoice.id}/pdf`}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                    >
                      <FileCheck className="h-4 w-4" />
                      Invoice — {request.invoice.invoiceNumber}
                    </a>
                  )}
                  {request.subRequests.flatMap((sr) =>
                    sr.certificates.map((cert) => (
                      <a
                        key={cert.id}
                        href={`/api/v1/certificates/${cert.id}/download`}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <FileCheck className="h-4 w-4" />
                        {cert.fileName}
                      </a>
                    )),
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No documents available.</p>
              )}
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Status History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {request.statusTransitions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transitions recorded yet.</p>
              ) : (
                <div className="relative ml-3">
                  {/* Vertical line */}
                  <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-gray-200" />

                  <div className="space-y-6">
                    {request.statusTransitions.map((t) => (
                      <div key={t.id} className="relative pl-6">
                        {/* Dot */}
                        <div className="absolute left-[-4px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500" />

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={t.toStatus} type="request" />
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(t.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {statusLabels[t.fromStatus] ?? t.fromStatus} &rarr;{' '}
                            {statusLabels[t.toStatus] ?? t.toStatus}
                          </p>
                          <p className="text-xs text-muted-foreground">by {t.triggeredBy}</p>
                          {t.reason && (
                            <p className="text-xs italic text-muted-foreground">
                              &quot;{t.reason}&quot;
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Special Instructions */}
          {request.specialInstructions && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Special Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{request.specialInstructions}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
