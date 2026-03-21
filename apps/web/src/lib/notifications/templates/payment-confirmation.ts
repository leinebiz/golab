import { emailLayout } from './layout';

export function paymentConfirmationTemplate(data: Record<string, unknown>): string {
  const name = String(data.recipientName ?? 'there');
  const ref = String(data.requestRef ?? '');
  const amount = data.amount ? String(data.amount) : '';
  const url = String(data.portalUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://portal.golab.co.za');

  return emailLayout(`
    <h2 style="margin:0 0 16px;color:#111827;font-size:18px;">Payment Received</h2>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">Hi ${name},</p>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">Payment${amount ? ` of <strong>${amount}</strong>` : ''} received for request <strong>${ref}</strong>. Testing will begin shortly.</p>
    <a href="${url}/customer/finances" style="display:inline-block;padding:10px 24px;background-color:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">View Details</a>
  `);
}
