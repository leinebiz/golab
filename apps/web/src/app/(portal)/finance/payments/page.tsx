import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatZAR } from '@/lib/finance/format';
import { PAYMENT_STATUS_VARIANT } from '@/lib/finance/status-variants';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getPayments() {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
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
  });

  return payments.map((p) => ({
    id: p.id,
    invoiceNumber: p.invoice.invoiceNumber,
    organization: p.invoice.request.organization.name,
    amount: p.amount.toString(),
    currency: p.currency,
    status: p.status as 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED',
    provider: p.provider,
    confirmedAt: p.confirmedAt?.toISOString().split('T')[0] ?? null,
    createdAt: p.createdAt.toISOString().split('T')[0],
  }));
}

export default async function PaymentsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  const role = (session.user as unknown as Record<string, unknown>).role as string;
  if (!['GOLAB_ADMIN', 'GOLAB_FINANCE'].includes(role)) {
    redirect('/login');
  }

  const payments = await getPayments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-gray-500">Track all payment transactions across customer accounts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
          <CardDescription>Sorted by most recent</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Invoice</th>
                    <th className="pb-2 pr-4">Organization</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2 pr-4">Provider</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b">
                      <td className="py-3 pr-4 font-medium">{payment.invoiceNumber}</td>
                      <td className="py-3 pr-4">{payment.organization}</td>
                      <td className="py-3 pr-4 font-mono">{formatZAR(payment.amount)}</td>
                      <td className="py-3 pr-4 capitalize">{payment.provider}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={PAYMENT_STATUS_VARIANT[payment.status]}>
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="py-3">{payment.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {payments.length >= 100 && (
        <p className="text-sm text-gray-500 mt-2">Showing first 100 records.</p>
      )}
    </div>
  );
}
