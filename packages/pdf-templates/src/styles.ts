export const BASE_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1a1a1a; background: #fff; }
  @page { size: A4; margin: 20mm 15mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }
  .document { max-width: 210mm; margin: 0 auto; padding: 20mm 15mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #1e40af; }
  .header-logo { font-size: 28pt; font-weight: 700; color: #1e40af; }
  .header-logo span { color: #6b7280; font-weight: 400; }
  .header-info { text-align: right; font-size: 9pt; color: #6b7280; }
  .doc-title { font-size: 18pt; font-weight: 600; color: #1e40af; margin-bottom: 4px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 11pt; font-weight: 600; color: #1e40af; text-transform: uppercase; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .info-row { display: flex; gap: 8px; }
  .info-label { font-weight: 600; font-size: 9pt; color: #6b7280; min-width: 120px; }
  .info-value { font-size: 10pt; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  thead th { background: #f3f4f6; font-weight: 600; text-align: left; padding: 8px 10px; border-bottom: 2px solid #d1d5db; font-size: 9pt; text-transform: uppercase; color: #374151; }
  tbody td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .totals-table { width: auto; margin-left: auto; min-width: 280px; }
  .totals-table td { padding: 4px 10px; border-bottom: none; }
  .totals-table .total-row td { font-weight: 700; font-size: 12pt; border-top: 2px solid #1e40af; padding-top: 8px; color: #1e40af; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 8pt; color: #9ca3af; text-align: center; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9pt; font-weight: 600; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .certificate-border { border: 3px double #1e40af; padding: 24px; margin: 12px; }
  .certificate-seal { text-align: center; margin: 20px 0; font-size: 10pt; color: #6b7280; }
  .signature-block { display: flex; justify-content: space-between; margin-top: 40px; gap: 40px; }
  .signature-line { flex: 1; padding-top: 8px; border-top: 1px solid #000; font-size: 9pt; color: #6b7280; }
  .barcode-placeholder { text-align: center; padding: 12px; border: 1px dashed #999; margin: 8px 0; font-family: monospace; font-size: 14pt; letter-spacing: 2px; }
`;

export function wrapInDocument(title: string, body: string): string {
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<title>' + escapeHtml(title) + '</title>\n<style>' + BASE_STYLES + '</style>\n</head>\n<body>\n<div class="document">' + body + '</div>\n</body>\n</html>';
}

export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function formatCurrency(amount: number | string, currency = 'ZAR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return currency + ' ' + num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function golabHeader(docType: string, reference: string, date: Date | string): string {
  return '<div class="header"><div><div class="header-logo">Go<span>Lab</span></div></div><div class="header-info"><div class="doc-title">' + escapeHtml(docType) + '</div><div><strong>Ref:</strong> ' + escapeHtml(reference) + '</div><div><strong>Date:</strong> ' + formatDate(date) + '</div></div></div>';
}

export function golabFooter(): string {
  return '<div class="footer"><p>GoLab (Pty) Ltd - Independent Laboratory Services</p></div>';
}
