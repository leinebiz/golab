import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { logger } from '@/lib/observability/logger';

function verifyResendSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!webhookSecret) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    logger.warn('resend_inbound.webhook.secret_not_configured');
  }

  const rawBody = await request.text();

  if (webhookSecret) {
    const signature = request.headers.get('x-resend-signature') ?? '';
    if (!verifyResendSignature(rawBody, signature, webhookSecret)) {
      logger.warn('resend_inbound.webhook.invalid_signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  logger.info({ type: payload.type }, 'resend_inbound.webhook.received');

  return NextResponse.json({ received: true });
}
