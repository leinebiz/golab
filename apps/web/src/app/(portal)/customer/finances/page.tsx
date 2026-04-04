import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { formatZAR, formatDate } from '@/lib/finance/format';
import { CREDIT_STATUS_VARIANT, INVOICE_STATUS_VARIANT } from '@/lib/finance/status-variants';
import { CreditApplicationSection } from './credit-section';

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: { toString(): string };
  dueDate: Date;
  paidAt: Date | null;
  paymentLinkUrl: string | null;
  request: { reference: string };
}

interface PaymentRow {
  id: string;
  amount: { toString(): string };
  provider: string;
  providerPaymentId: string | null;
  confirmedAt: Date | null;
  invoice: {
    invoiceNumber: string;
    request: { reference: string };
  };
}

export default async function CustomerFinancesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { id: string; role: string; organizationId: string };
  if (!user.organizationId) {
    redirect('/login');
  }

  const [creditAccount, invoices, payments] = await Promise.all([
    prisma.creditAccount.findUnique({
      where: { organizationId: user.organizationId },
    }),
    prisma.invoice.findMany({
      where: {
        request: { organizationId: user.organizationId },
      },
      include: {
        request: {
          select: { reference: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.payment.findMany({
      where: {
        invoice: {
          request: { organizationId: user.organizationId },
        },
        status: 'CONFIRMED',
      },
      include: {
        invoice: {
          select: { invoiceNumber: true, request: { select: { reference: true } } },
        },
      },
      orderBy: { confirmedAt: 'desc' },
      take: 50,
    }),
  ]);

  const creditStatus = creditAccount?.status ?? 'NOT_APPLIED';
  const creditLimit = creditAccount?.creditLimit?.toString() ?? '0';
  const availableCredit = creditAccount?.availableCredit?.toString() ?? '0';
  const outstandingBalance = creditAccount?.outstandingBalance?.toString() ?? '0';

  const canApplyForCredit = creditStatus === 'NOT_APPLIED' || creditStatus === 'DECLINED';
  const isPendingReview = creditStatus === 'PENDING_REVIEW';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finances</h1>
        <p className="text-gray-500">Manage your credit, invoices, and payments</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Credit Status</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant={CREDIT_STATUS_VARIANT[creditStatus]}>
              {creditStatus.replace(/_/g, ' ')}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Credit Limit</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatZAR(creditLimit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available Credit</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatZAR(availableCredit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding Balance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{formatZAR(outstandingBalance)}</p>
          </CardContent>
        </Card>
      </div>

      <CreditApplicationSection canApply={canApplyForCredit} isPending={isPendingReview} />

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>View and pay your invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-gray-500">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Invoice</th>
                    <th className="pb-2 pr-4">Request</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2 pr-4">Due Date</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice: InvoiceRow) => (
                    <tr key={invoice.id} className="border-b">
                      <td className="py-3 pr-4 font-medium">{invoice.invoiceNumber}</td>
                      <td className="py-3 pr-4">{invoice.request.reference}</td>
                      <td className="py-3 pr-4 font-mono">
                        {formatZAR(invoice.totalAmount.toString())}
                      </td>
                      <td className="py-3 pr-4">{formatDate(invoice.dueDate.toISOString())}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={INVOICE_STATUS_VARIANT[invoice.status]}>
                          {invoice.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {invoice.paymentLinkUrl && invoice.status !== 'PAID' && (
                          <a
                            href={invoice.paymentLinkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Pay Now
                          </a>
                        )}
                        {invoice.paidAt && (
                          <span className="text-xs text-green-600">
                            Paid {formatDate(invoice.paidAt.toISOString())}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Confirmed COD and credit payments</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Invoice</th>
                    <th className="pb-2 pr-4">Request</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2 pr-4">Provider</th>
                    <th className="pb-2">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment: PaymentRow) => (
                    <tr key={payment.id} className="border-b">
                      <td className="py-3 pr-4">
                        {payment.confirmedAt ? formatDate(payment.confirmedAt.toISOString()) : '—'}
                      </td>
                      <td className="py-3 pr-4 font-medium">{payment.invoice.invoiceNumber}</td>
                      <td className="py-3 pr-4">{payment.invoice.request.reference}</td>
                      <td className="py-3 pr-4 font-mono">
                        {formatZAR(payment.amount.toString())}
                      </td>
                      <td className="py-3 pr-4">{payment.provider}</td>
                      <td className="py-3 font-mono text-xs text-gray-500">
                        {payment.providerPaymentId
                          ? payment.providerPaymentId.length > 16
                            ? `${payment.providerPaymentId.slice(0, 16)}...`
                            : payment.providerPaymentId
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
