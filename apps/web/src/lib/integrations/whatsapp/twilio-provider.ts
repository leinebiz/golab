/**
 * WhatsApp provider using Twilio API.
 *
 * In development/test, messages are logged to console.
 * In production, calls the Twilio WhatsApp Business API.
 */

export interface WhatsAppMessage {
  to: string;
  templateName: string;
  variables: Record<string, unknown>;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Send a WhatsApp message via Twilio.
 *
 * Uses template-based sending. In dev mode, logs the message
 * instead of making an API call.
 */
export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
  if (!message.to) {
    return { success: false, error: 'No recipient phone number provided' };
  }

  if (isDev) {
    console.log('[whatsapp:dev] Would send message:', {
      to: message.to,
      template: message.templateName,
      variables: message.variables,
    });
    return { success: true, messageId: `dev-${Date.now()}` };
  }

  // Production: call Twilio API
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: 'Twilio credentials not configured' };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const body = new URLSearchParams({
      From: `whatsapp:${fromNumber}`,
      To: `whatsapp:${message.to}`,
      ContentSid: message.templateName,
      ContentVariables: JSON.stringify(message.variables),
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        error: `Twilio API error (${response.status}): ${errorBody}`,
      };
    }

    const result = (await response.json()) as { sid: string };
    return { success: true, messageId: result.sid };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown Twilio error';
    return { success: false, error: errorMessage };
  }
}
