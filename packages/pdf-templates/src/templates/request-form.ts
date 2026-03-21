import { wrapInDocument, escapeHtml, formatCurrency, golabHeader, golabFooter } from '../styles';

export interface RequestFormTest { testName: string; testCode: string; sampleCount: number; accreditationRequired: boolean; unitPrice: number | string; totalPrice: number | string; toleranceMin?: number | string | null; toleranceMax?: number | string | null; toleranceUnit?: string | null; }
export interface RequestFormSubRequest { subReference: string; laboratoryName: string; tests: RequestFormTest[]; }
export interface RequestFormData { reference: string; date: Date | string; status: string; turnaroundType: string; specialInstructions?: string | null; customer: { name: string; registrationNumber?: string | null; vatNumber?: string | null; contactName: string; contactEmail: string; contactPhone?: string | null; }; collectionAddress?: { line1: string; line2?: string | null; city: string; province: string; postalCode: string; } | null; subRequests: RequestFormSubRequest[]; }

export function renderRequestForm(data: RequestFormData): string {
  const c = data.customer;
  const cust = '<div class="section"><div class="section-title">Customer Details</div><div class="info-grid">' +
    '<div class="info-row"><span class="info-label">Company:</span><span class="info-value">' + escapeHtml(c.name) + '</span></div>' +
    '<div class="info-row"><span class="info-label">Contact:</span><span class="info-value">' + escapeHtml(c.contactName) + '</span></div>' +
    (c.registrationNumber ? '<div class="info-row"><span class="info-label">Reg No:</span><span class="info-value">' + escapeHtml(c.registrationNumber) + '</span></div>' : '') +
    '<div class="info-row"><span class="info-label">Email:</span><span class="info-value">' + escapeHtml(c.contactEmail) + '</span></div>' +
    '</div></div>';
  const info = '<div class="section"><div class="section-title">Request Information</div><div class="info-grid">' +
    '<div class="info-row"><span class="info-label">Status:</span><span class="badge badge-blue">' + escapeHtml(data.status.replace(/_/g, ' ')) + '</span></div>' +
    '<div class="info-row"><span class="info-label">Turnaround:</span><span class="info-value">' + escapeHtml(data.turnaroundType) + '</span></div>' +
    '</div></div>';
  const subs = data.subRequests.map(sr => {
    const rows = sr.tests.map(t => '<tr><td>' + escapeHtml(t.testName) + '</td><td>' + escapeHtml(t.testCode) + '</td><td class="text-center">' + t.sampleCount + '</td><td class="text-right">' + formatCurrency(t.unitPrice) + '</td><td class="text-right">' + formatCurrency(t.totalPrice) + '</td></tr>').join('');
    return '<div class="section"><div class="section-title">Sub-Request: ' + escapeHtml(sr.subReference) + ' - ' + escapeHtml(sr.laboratoryName) + '</div><table><thead><tr><th>Test</th><th>Code</th><th class="text-center">Samples</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }).join('');
  return wrapInDocument('Request Form - ' + data.reference, golabHeader('Request Form', data.reference, data.date) + cust + info + subs + golabFooter());
}
