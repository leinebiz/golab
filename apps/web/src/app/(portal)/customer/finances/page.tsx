'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatZAR, formatDate } from '@/lib/finance/format';
import { CREDIT_STATUS_VARIANT, INVOICE_STATUS_VARIANT } from '@/lib/finance/status-variants';

type CreditStatus = 'NOT_APPLIED' | 'PENDING_REVIEW' | 'APPROVED' | 'DECLINED' | 'SUSPENDED';
type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PAYMENT_LINK_SENT'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'CREDITED';

interface CreditAccount {
  status: CreditStatus;
  creditLimit: string;
  availableCredit: string;
  outstandingBalance: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  totalAmount: string;
  dueDate: string;
  paidAt: string | null;
  paymentLinkUrl: string | null;
  request: { reference: string };
}

const PLACEHOLDER_CREDIT: CreditAccount = {
  status: 'NOT_APPLIED',
  creditLimit: '0',
  availableCredit: '0',
  outstandingBalance: '0',
};

const PLACEHOLDER_INVOICES: Invoice[] = [];

export default function CustomerFinancesPage() {
  const [creditAccount] = useState<CreditAccount>(PLACEHOLDER_CREDIT);
  const [invoices] = useState<Invoice[]>(PLACEHOLDER_INVOICES);
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [creditFormSubmitted, setCreditFormSubmitted] = useState(false);

  const canApplyForCredit =
    creditAccount.status === 'NOT_APPLIED' || creditAccount.status === 'DECLINED';

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
            <Badge variant={CREDIT_STATUS_VARIANT[creditAccount.status]}>
              {creditAccount.status.replace(/_/g, ' ')}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Credit Limit</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatZAR(creditAccount.creditLimit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available Credit</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatZAR(creditAccount.availableCredit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding Balance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              {formatZAR(creditAccount.outstandingBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {canApplyForCredit && !creditFormSubmitted && (
        <Card>
          <CardHeader>
            <CardTitle>Apply for Credit</CardTitle>
            <CardDescription>
              Submit a credit application to enable 30-day payment terms on your orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showCreditForm ? (
              <Button onClick={() => setShowCreditForm(true)}>Start Application</Button>
            ) : (
              <CreditApplicationForm
                onSubmit={() => {
                  setCreditFormSubmitted(true);
                  setShowCreditForm(false);
                }}
                onCancel={() => setShowCreditForm(false)}
              />
            )}
          </CardContent>
        </Card>
      )}

      {creditFormSubmitted && (
        <Card>
          <CardHeader>
            <CardTitle>Application Submitted</CardTitle>
            <CardDescription>
              Your credit application has been submitted and is pending review. We will notify you
              once a decision is made.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

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
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b">
                      <td className="py-3 pr-4 font-medium">{invoice.invoiceNumber}</td>
                      <td className="py-3 pr-4">{invoice.request.reference}</td>
                      <td className="py-3 pr-4 font-mono">{formatZAR(invoice.totalAmount)}</td>
                      <td className="py-3 pr-4">{formatDate(invoice.dueDate)}</td>
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
                            Paid {formatDate(invoice.paidAt)}
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
    </div>
  );
}

function CreditApplicationForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const [companyReg, setCompanyReg] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [requestedLimit, setRequestedLimit] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSubmitting(false);
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="companyReg" className="mb-1 block text-sm font-medium text-gray-700">
          Company Registration Number
        </label>
        <Input
          id="companyReg"
          value={companyReg}
          onChange={(e) => setCompanyReg(e.target.value)}
          required
          placeholder="e.g. 2024/123456/07"
        />
      </div>
      <div>
        <label htmlFor="vatNumber" className="mb-1 block text-sm font-medium text-gray-700">
          VAT Number (optional)
        </label>
        <Input
          id="vatNumber"
          value={vatNumber}
          onChange={(e) => setVatNumber(e.target.value)}
          placeholder="e.g. 4123456789"
        />
      </div>
      <div>
        <label htmlFor="requestedLimit" className="mb-1 block text-sm font-medium text-gray-700">
          Requested Credit Limit (ZAR)
        </label>
        <Input
          id="requestedLimit"
          type="number"
          min="0"
          step="0.01"
          value={requestedLimit}
          onChange={(e) => setRequestedLimit(e.target.value)}
          required
          placeholder="e.g. 50000.00"
        />
      </div>
      <div>
        <label htmlFor="reason" className="mb-1 block text-sm font-medium text-gray-700">
          Reason for Credit Application
        </label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          placeholder="Describe your testing needs and expected monthly volume..."
          rows={3}
        />
      </div>
      <div>
        <label htmlFor="documents" className="mb-1 block text-sm font-medium text-gray-700">
          Supporting Documents
        </label>
        <Input id="documents" type="file" multiple accept=".pdf,.jpg,.png,.doc,.docx" />
        <p className="mt-1 text-xs text-gray-500">
          Upload company registration documents, financial statements, or trade references.
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Application'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
