import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(value);
}

const SUMMARY = {
  totalOutstanding: 0,
  totalPaidThisMonth: 0,
  pendingCreditApplications: 0,
  overdueInvoices: 0,
};

const RECENT_PAYMENTS: {
  id: string;
  invoiceNumber: string;
  organization: string;
  amount: number;
  date: string;
  status: 'CONFIRMED' | 'PENDING' | 'FAILED';
}[] = [];

const PAYMENT_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive'> = {
  CONFIRMED: 'success',
  PENDING: 'warning',
  FAILED: 'destructive',
};

export default function FinanceDashboardPage() {
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
              {formatCurrency(SUMMARY.totalOutstanding)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid This Month</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(SUMMARY.totalPaidThisMonth)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Credit Applications</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {SUMMARY.pendingCreditApplications}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue Invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{SUMMARY.overdueInvoices}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>Latest payment activity across all accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {RECENT_PAYMENTS.length === 0 ? (
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
                  {RECENT_PAYMENTS.map((payment) => (
                    <tr key={payment.id} className="border-b">
                      <td className="py-3 pr-4 font-medium">{payment.invoiceNumber}</td>
                      <td className="py-3 pr-4">{payment.organization}</td>
                      <td className="py-3 pr-4 font-mono">{formatCurrency(payment.amount)}</td>
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
