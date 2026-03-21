import { wrapInDocument, escapeHtml, formatCurrency, formatDate, golabHeader, golabFooter } from '../styles';

export interface QuoteLineItem { description: string; testCode?: string; laboratory?: string; quantity: number; unitPrice: number | string; totalPrice: number | string; }
export interface QuoteData { quoteNumber: string; requestReference: string; date: Date | string; expiresAt: Date | string; customer: { name: string; registrationNumber?: string | null; vatNumber?: string | null; contactName: string; contactEmail: string; }; lineItems: QuoteLineItem[]; subtotal: number | string; expediteSurcharge: number | string; logisticsCost: number | string; adminFee: number | string; vatRate: number | string; vatAmount: number | string; totalAmount: number | string; }

export function renderQuote(data: QuoteData): string {
  const c = data.customer;
  const cust = '<div class="section"><div class="section-title">Quoted To</div><div class="info-grid">' +
    '<div class="info-row"><span class="info-label">Company:</span><span class="info-value">' + escapeHtml(c.name) + '</span></div>' +
    '<div class="info-row"><span class="info-label">Contact:</span><span class="info-value">' + escapeHtml(c.contactName) + '</span></div>' +
    '<div class="info-row"><span class="info-label">Request Ref:</span><span class="info-value">' + escapeHtml(data.requestReference) + '</span></div>' +
    '<div class="info-row"><span class="info-label">Valid Until:</span><span class="info-value">' + formatDate(data.expiresAt) + '</span></div></div></div>';
  const rows = data.lineItems.map(i => '<tr><td>' + escapeHtml(i.description) + '</td><td class="text-center">' + i.quantity + '</td><td class="text-right">' + formatCurrency(i.unitPrice) + '</td><td class="text-right">' + formatCurrency(i.totalPrice) + '</td></tr>').join('');
  const items = '<div class="section"><div class="section-title">Line Items</div><table><thead><tr><th>Description</th><th class="text-center">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  const totals = '<div class="section"><table class="totals-table"><tbody>' +
    '<tr><td class="info-label">Subtotal</td><td class="text-right">' + formatCurrency(data.subtotal) + '</td></tr>' +
    (Number(data.expediteSurcharge) > 0 ? '<tr><td class="info-label">Expedite</td><td class="text-right">' + formatCurrency(data.expediteSurcharge) + '</td></tr>' : '') +
    (Number(data.logisticsCost) > 0 ? '<tr><td class="info-label">Logistics</td><td class="text-right">' + formatCurrency(data.logisticsCost) + '</td></tr>' : '') +
    '<tr><td class="info-label">VAT (' + (Number(data.vatRate) * 100).toFixed(0) + '%)</td><td class="text-right">' + formatCurrency(data.vatAmount) + '</td></tr>' +
    '<tr class="total-row"><td>Total</td><td class="text-right">' + formatCurrency(data.totalAmount) + '</td></tr></tbody></table></div>';
  return wrapInDocument('Quotation - ' + data.quoteNumber, golabHeader('Quotation', data.quoteNumber, data.date) + cust + items + totals + golabFooter());
}
