import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatZAR } from '@/lib/finance/format';
import { PAYMENT_STATUS_VARIANT } from '@/lib/finance/status-variants';

type PaymentStatus = 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED';

const PLACEHOLDER_PAYMENTS: {
  id: string;
  invoiceNumber: string;
  organization: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  confirmedAt: string | null;
  createdAt: string;
}[] = [];

export default function PaymentsPage() {
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
          {PLACEHOLDER_PAYMENTS.length === 0 ? (
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
                  {PLACEHOLDER_PAYMENTS.map((payment) => (
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
    </div>
  );
}
