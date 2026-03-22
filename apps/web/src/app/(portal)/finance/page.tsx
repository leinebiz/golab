import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatZAR } from '@/lib/finance/format';
import { PAYMENT_STATUS_VARIANT } from '@/lib/finance/status-variants';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getFinanceSummary() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [outstandingResult, paidThisMonthResult, pendingCreditCount, overdueCount, recentPayments] =
    await Promise.all([
      prisma.invoice.aggregate({
        where: { status: { in: ['ISSUED', 'PAYMENT_LINK_SENT', 'OVERDUE'] } },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { status: 'PAID', paidAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.creditAccount.count({
        where: { status: 'PENDING_REVIEW' },
      }),
      prisma.invoice.count({
        where: { status: 'OVERDUE' },
      }),
      prisma.payment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
              request: {
                select: {
                  organization: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
    ]);

  return {
    summary: {
      totalOutstanding: Number(outstandingResult._sum.totalAmount ?? 0),
      totalPaidThisMonth: Number(paidThisMonthResult._sum.totalAmount ?? 0),
      pendingCreditApplications: pendingCreditCount,
      overdueInvoices: overdueCount,
    },
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      invoiceNumber: p.invoice.invoiceNumber,
      organization: p.invoice.request.organization.name,
      amount: Number(p.amount),
      date: p.createdAt.toISOString().split('T')[0],
      status: p.status as 'CONFIRMED' | 'PENDING' | 'FAILED',
    })),
  };
}

export default async function FinanceDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  const role = (session.user as unknown as Record<string, unknown>).role as string;
  if (!['GOLAB_ADMIN', 'GOLAB_FINANCE'].includes(role)) {
    redirect('/login');
  }

  const { summary, recentPayments } = await getFinanceSummary();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance Dashboard</h1>
        <p className="text-gray-500">Overview of payments, invoices, and credit accounts</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Outstanding</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              {formatZAR(summary.totalOutstanding)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid This Month</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatZAR(summary.totalPaidThisMonth)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Credit Applications</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {summary.pendingCreditApplications}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue Invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{summary.overdueInvoices}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>Latest payment activity across all accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-gray-500">No recent payments.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Invoice</th>
                    <th className="pb-2 pr-4">Organization</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((payment) => (
                    <tr key={payment.id} className="border-b">
                      <td className="py-3 pr-4 font-medium">{payment.invoiceNumber}</td>
                      <td className="py-3 pr-4">{payment.organization}</td>
                      <td className="py-3 pr-4 font-mono">{formatZAR(payment.amount)}</td>
                      <td className="py-3 pr-4">{payment.date}</td>
                      <td className="py-3">
                        <Badge variant={PAYMENT_STATUS_VARIANT[payment.status]}>
                          {payment.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credit Applications</CardTitle>
            <CardDescription>Review pending credit requests</CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/finance/credit" className="text-sm text-blue-600 hover:underline">
              View applications &rarr;
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoices</CardTitle>
            <CardDescription>Manage all invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/finance/invoices" className="text-sm text-blue-600 hover:underline">
              View invoices &rarr;
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accounts</CardTitle>
            <CardDescription>Customer account overview</CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/finance/accounts" className="text-sm text-blue-600 hover:underline">
              View accounts &rarr;
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
