import { getEmailTemplate } from './templates';
import type { NotificationEventType } from './types';

interface SendEmailParams {
  to: string;
  recipientName: string;
  subject: string;
  body: string;
  eventType: NotificationEventType;
  data: Record<string, unknown>;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendNotificationEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  const { to, recipientName, subject, body, eventType, data } = params;

  const html = getEmailTemplate(eventType, {
    recipientName,
    subject,
    body,
    ...data,
  });

  if (process.env.NODE_ENV !== 'production' || !process.env.EMAIL_PROVIDER_API_KEY) {
    console.log(`[email:dev] To: ${to}, Subject: ${subject}, HTML: ${html.length}chars`);
    return { success: true, messageId: `dev-${Date.now()}` };
  }

  try {
    const response = await fetch(
      process.env.EMAIL_PROVIDER_URL ?? 'https://api.sendgrid.com/v3/mail/send',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.EMAIL_PROVIDER_API_KEY}`,
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to, name: recipientName }] }],
          from: {
            email: process.env.EMAIL_FROM ?? 'notifications@golab.co.za',
            name: process.env.EMAIL_FROM_NAME ?? 'GoLab',
          },
          subject,
          content: [{ type: 'text/html', value: html }],
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        error: `Email provider returned ${response.status}: ${errorBody}`,
      };
    }

    const messageId = response.headers.get('x-message-id') ?? undefined;
    return { success: true, messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
