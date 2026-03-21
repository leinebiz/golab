import { wrapInDocument, escapeHtml, formatCurrency, formatDate, golabHeader, golabFooter } from '../styles';

export interface InvoiceLineItem { description: string; quantity: number; unitPrice: number | string; totalPrice: number | string; }
export interface InvoiceData { invoiceNumber: string; requestReference: string; date: Date | string; dueDate: Date | string; status: string; customer: { name: string; registrationNumber?: string | null; vatNumber?: string | null; contactName: string; contactEmail: string; billingAddress?: { line1: string; line2?: string | null; city: string; province: string; postalCode: string; } | null; }; lineItems: InvoiceLineItem[]; subtotal: number | string; vatAmount: number | string; totalAmount: number | string; paymentLinkUrl?: string | null; }

export function renderInvoice(data: InvoiceData): string {
  const badge = data.status === 'PAID' ? 'badge-green' : data.status === 'OVERDUE' ? 'badge-red' : 'badge-amber';
  const c = data.customer;
  const billTo = '<div><div class="section-title">Bill To</div><strong>' + escapeHtml(c.name) + '</strong><br>' + escapeHtml(c.contactName) + '<br>' + escapeHtml(c.contactEmail) + '</div>';
  const details = '<div><div class="section-title">Invoice Details</div><div class="info-row"><span class="info-label">Status:</span><span class="badge ' + badge + '">' + escapeHtml(data.status.replace(/_/g, ' ')) + '</span></div>' +
    '<div class="info-row"><span class="info-label">Request:</span><span class="info-value">' + escapeHtml(data.requestReference) + '</span></div>' +
    '<div class="info-row"><span class="info-label">Due:</span><span class="info-value">' + formatDate(data.dueDate) + '</span></div></div>';
  const rows = data.lineItems.map(i => '<tr><td>' + escapeHtml(i.description) + '</td><td class="text-center">' + i.quantity + '</td><td class="text-right">' + formatCurrency(i.unitPrice) + '</td><td class="text-right">' + formatCurrency(i.totalPrice) + '</td></tr>').join('');
  const items = '<div class="section"><table><thead><tr><th>Description</th><th class="text-center">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Amount</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  const totals = '<div class="section"><table class="totals-table"><tbody><tr><td class="info-label">Subtotal</td><td class="text-right">' + formatCurrency(data.subtotal) + '</td></tr><tr><td class="info-label">VAT (15%)</td><td class="text-right">' + formatCurrency(data.vatAmount) + '</td></tr><tr class="total-row"><td>Total Due</td><td class="text-right">' + formatCurrency(data.totalAmount) + '</td></tr></tbody></table></div>';
  return wrapInDocument('Invoice - ' + data.invoiceNumber, golabHeader('Tax Invoice', data.invoiceNumber, data.date) + '<div class="section"><div class="info-grid">' + billTo + details + '</div></div>' + items + totals + golabFooter());
}
