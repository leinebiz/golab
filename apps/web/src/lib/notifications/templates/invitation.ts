import { emailLayout } from './layout';

export function invitationTemplate(data: Record<string, unknown>): string {
  const name = String(data.recipientName ?? 'there');
  const org = String(data.organizationName ?? 'your organization');
  const url = String(
    data.portalUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://portal.golab.co.za',
  );
  const token = data.inviteToken ? String(data.inviteToken) : '';
  const registerUrl = token ? `${url}/register?token=${token}` : `${url}/register`;

  return emailLayout(`
    <h2 style="margin:0 0 16px;color:#111827;font-size:18px;">You're Invited to GoLab</h2>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">Hi ${name},</p>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">You have been invited to join <strong>${org}</strong> on GoLab.</p>
    <a href="${registerUrl}" style="display:inline-block;padding:10px 24px;background-color:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">Accept Invitation</a>
    <p style="margin:24px 0 0;color:#6b7280;font-size:12px;">This invitation expires in 7 days.</p>
  `);
}
