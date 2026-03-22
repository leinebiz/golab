import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatZAR, formatDate } from '@/lib/finance/format';
import { INVOICE_STATUS_VARIANT } from '@/lib/finance/status-variants';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getInvoices() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      request: {
        select: {
          organization: { select: { name: true } },
        },
      },
    },
  });

  return invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    organization: inv.request.organization.name,
    totalAmount: Number(inv.totalAmount),
    status: inv.status as
      | 'DRAFT'
      | 'ISSUED'
      | 'PAYMENT_LINK_SENT'
      | 'PAID'
      | 'OVERDUE'
      | 'CANCELLED'
      | 'CREDITED',
    dueDate: inv.dueDate.toISOString(),
    issuedAt: inv.issuedAt?.toISOString() ?? inv.createdAt.toISOString(),
  }));
}

export default async function InvoicesPage() {
  const invoices = await getInvoices();

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
          {invoices.length === 0 ? (
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
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b">
                      <td className="py-3 pr-4 font-medium">{invoice.invoiceNumber}</td>
                      <td className="py-3 pr-4">{invoice.organization}</td>
                      <td className="py-3 pr-4 font-mono">{formatZAR(invoice.totalAmount)}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={INVOICE_STATUS_VARIANT[invoice.status]}>
                          {invoice.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">{formatDate(invoice.issuedAt)}</td>
                      <td className="py-3">{formatDate(invoice.dueDate)}</td>
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
