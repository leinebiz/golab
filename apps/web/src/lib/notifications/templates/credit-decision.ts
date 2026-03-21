import { emailLayout } from './layout';

export function creditDecisionTemplate(data: Record<string, unknown>): string {
  const name = String(data.recipientName ?? 'there');
  const limit = data.creditLimit ? String(data.creditLimit) : undefined;
  const approved = data.eventType === 'credit.approved' || !!limit;
  const url = String(data.portalUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://portal.golab.co.za');
  const body = approved
    ? `Your credit application has been <strong style="color:#16a34a;">approved</strong>.${limit ? ` Your credit limit is <strong>${limit}</strong>.` : ''}`
    : 'Unfortunately, your credit application has been <strong style="color:#dc2626;">declined</strong>. You can continue using GoLab with cash-on-delivery.';

  return emailLayout(`
    <h2 style="margin:0 0 16px;color:#111827;font-size:18px;">Credit Application Decision</h2>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">Hi ${name},</p>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">${body}</p>
    <a href="${url}/customer/finances" style="display:inline-block;padding:10px 24px;background-color:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">View Account</a>
  `);
}
