import { wrapInDocument, escapeHtml, formatDate, golabFooter } from '../styles';

export interface WaybillAddress { line1: string; line2?: string | null; city: string; province: string; postalCode: string; contactName?: string; contactPhone?: string; }
export interface WaybillData { waybillNumber: string; date: Date | string; courierProvider: string; subReference: string; requestReference: string; collectionAddress: WaybillAddress; deliveryAddress: WaybillAddress; parcelCount?: number; weightKg?: number; instructions?: string | null; estimatedDelivery?: Date | string | null; }

function addr(a: WaybillAddress): string {
  return (a.contactName ? '<strong>' + escapeHtml(a.contactName) + '</strong><br>' : '') + escapeHtml(a.line1) + '<br>' + (a.line2 ? escapeHtml(a.line2) + '<br>' : '') + escapeHtml(a.city) + ', ' + escapeHtml(a.province) + ' ' + escapeHtml(a.postalCode);
}

export function renderWaybill(data: WaybillData): string {
  const hdr = '<div class="header"><div><div class="header-logo">Go<span>Lab</span></div></div><div class="header-info"><div class="doc-title">Waybill</div><div><strong>Date:</strong> ' + formatDate(data.date) + '</div></div></div>';
  const barcode = '<div style="border: 2px solid #000; padding: 16px; margin-bottom: 20px;"><div class="barcode-placeholder">' + escapeHtml(data.waybillNumber) + '</div>' +
    '<div style="text-align: center; font-size: 8pt; color: #6b7280;">Courier: ' + escapeHtml(data.courierProvider) + ' | Sub-Ref: ' + escapeHtml(data.subReference) + ' | Request: ' + escapeHtml(data.requestReference) + '</div>';
  const addrs = '<div class="info-grid" style="gap: 16px; margin-top: 12px;"><div><div class="section-title">From (Collection)</div>' + addr(data.collectionAddress) + '</div><div><div class="section-title">To (Delivery)</div>' + addr(data.deliveryAddress) + '</div></div>';
  const info = '<div style="margin-top: 12px; border-top: 1px solid #e5e7eb; padding-top: 8px;"><div class="info-grid"><div class="info-row"><span class="info-label">Parcels:</span><span class="info-value">' + (data.parcelCount ?? 1) + '</span></div><div class="info-row"><span class="info-label">Weight:</span><span class="info-value">' + (data.weightKg ?? '-') + ' kg</span></div></div></div></div>';
  const sig = '<div class="signature-block"><div class="signature-line">Sender Signature</div><div class="signature-line">Driver Signature</div><div class="signature-line">Receiver Signature</div></div>';
  return wrapInDocument('Waybill - ' + data.waybillNumber, hdr + barcode + addrs + info + sig + golabFooter());
}
