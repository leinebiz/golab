import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatZAR } from '@/lib/finance/format';
import { INVOICE_STATUS_VARIANT } from '@/lib/finance/status-variants';

type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PAYMENT_LINK_SENT'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'CREDITED';

const PLACEHOLDER_INVOICES: {
  id: string;
  invoiceNumber: string;
  organization: string;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate: string;
  issuedAt: string;
}[] = [];

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-gray-500">Manage invoices across all customer accounts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>Sorted by most recent</CardDescription>
        </CardHeader>
        <CardContent>
          {PLACEHOLDER_INVOICES.length === 0 ? (
            <p className="text-sm text-gray-500">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Invoice #</th>
                    <th className="pb-2 pr-4">Organization</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Issued</th>
                    <th className="pb-2">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {PLACEHOLDER_INVOICES.map((invoice) => (
                    <tr key={invoice.id} className="border-b">
                      <td className="py-3 pr-4 font-medium">{invoice.invoiceNumber}</td>
                      <td className="py-3 pr-4">{invoice.organization}</td>
                      <td className="py-3 pr-4 font-mono">{formatZAR(invoice.totalAmount)}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={INVOICE_STATUS_VARIANT[invoice.status]}>
                          {invoice.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">{invoice.issuedAt}</td>
                      <td className="py-3">{invoice.dueDate}</td>
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
