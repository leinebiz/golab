import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { logger } from '@/lib/observability/logger';

function verifyTwilioSignature(
  rawBody: string,
  signature: string,
  authToken: string,
  url: string,
): boolean {
  // Twilio signs the full URL + sorted POST params with HMAC-SHA1
  const params = new URLSearchParams(rawBody);
  const sortedKeys = Array.from(params.keys()).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params.get(key);
  }
  const expected = crypto.createHmac('sha1', authToken).update(data).digest('base64');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    logger.warn('twilio_whatsapp.webhook.secret_not_configured');
  }

  const rawBody = await request.text();

  if (authToken) {
    const signature = request.headers.get('x-twilio-signature') ?? '';
    const url = request.url;
    if (!verifyTwilioSignature(rawBody, signature, authToken, url)) {
      logger.warn('twilio_whatsapp.webhook.invalid_signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let payload: Record<string, string>;
  try {
    // Twilio sends form-encoded data
    const params = new URLSearchParams(rawBody);
    payload = Object.fromEntries(params.entries());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  logger.info(
    { from: payload.From, messageSid: payload.MessageSid },
    'twilio_whatsapp.webhook.received',
  );

  // Return TwiML empty response
  return new NextResponse('<Response></Response>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}
