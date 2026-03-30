import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/observability/logger';
import { logAuditActivity, AuditActions } from '@/lib/audit/prisma-audit-middleware';
import crypto from 'crypto';
import { checkRateLimit, rateLimitResponse } from '@/lib/security/rate-limiter';

/**
 * POST /api/webhooks/twilio-whatsapp
 *
 * Receives inbound WhatsApp messages from Twilio.
 *
 * Setup:
 * 1. Configure Twilio WhatsApp Sandbox or Business number
 * 2. Set this URL as the "When a message comes in" webhook in Twilio console
 * 3. Set TWILIO_AUTH_TOKEN env var for signature verification
 *
 * Twilio sends form-encoded POST with fields:
 *   MessageSid, AccountSid, From, To, Body, NumMedia, MediaUrl0, etc.
 *
 * From format: "whatsapp:+27821234567"
 */
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed, resetAt } = checkRateLimit(ip, 'webhook');
  if (!allowed) return rateLimitResponse(resetAt);

  try {
    // Read body as text so we can use it for both signature verification and parsing
    const formBody = await request.text();
    const params = Object.fromEntries(new URLSearchParams(formBody));

    // Verify Twilio signature
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (authToken) {
      const twilioSignature = request.headers.get('x-twilio-signature');
      if (!twilioSignature) {
        logger.warn('twilio_whatsapp.webhook.missing_signature');
        return new NextResponse('<Response></Response>', {
          status: 401,
          headers: { 'Content-Type': 'text/xml' },
        });
      }

      // Twilio signature verification: HMAC-SHA1 of URL + sorted params
      const url =
        process.env.TWILIO_WEBHOOK_URL ??
        `${process.env.NEXTAUTH_URL}/api/webhooks/twilio-whatsapp`;
      const sortedParams = Object.keys(params)
        .sort()
        .reduce((acc, key) => acc + key + params[key], '');
      const data = url + sortedParams;
      const expectedSig = crypto
        .createHmac('sha1', authToken)
        .update(Buffer.from(data, 'utf-8'))
        .digest('base64');

      if (!crypto.timingSafeEqual(Buffer.from(twilioSignature), Buffer.from(expectedSig))) {
        logger.warn('twilio_whatsapp.webhook.invalid_signature');
        return new NextResponse('<Response></Response>', {
          status: 401,
          headers: { 'Content-Type': 'text/xml' },
        });
      }
    }

    // Extract fields from parsed form-encoded body
    const messageSid = params.MessageSid;
    const from = params.From; // "whatsapp:+27821234567"
    const body = params.Body;
    const numMedia = parseInt(params.NumMedia ?? '0');

    if (!messageSid || !from) {
      return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
    }

    // Idempotency
    const existing = await prisma.inboundMessage.findUnique({
      where: { providerMessageId: messageSid },
    });
    if (existing) {
      return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
    }

    // Extract phone number: "whatsapp:+27821234567" → "+27821234567"
    const phoneNumber = from.replace('whatsapp:', '');

    // Try to resolve to a GoLab user by WhatsApp number
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ whatsappNumber: phoneNumber }, { phone: phoneNumber }],
      },
      select: { id: true, name: true, organizationId: true },
    });

    // Try to find related request for context
    let requestId: string | null = null;
    if (user) {
      const recentRequest = await prisma.request.findFirst({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      requestId = recentRequest?.id ?? null;
    }

    // Collect attachment metadata
    const attachments: Array<{ name: string; contentType: string; url: string }> = [];
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = params[`MediaUrl${i}`];
      const mediaContentType = params[`MediaContentType${i}`];
      if (mediaUrl) {
        attachments.push({
          name: `attachment-${i}`,
          contentType: mediaContentType ?? 'application/octet-stream',
          url: mediaUrl,
        });
      }
    }

    await prisma.inboundMessage.create({
      data: {
        channel: 'WHATSAPP',
        fromAddress: phoneNumber,
        fromName: user?.name ?? null,
        userId: user?.id ?? null,
        organizationId: user?.organizationId ?? null,
        subject: null, // WhatsApp messages don't have subjects
        body: body ?? '',
        threadId: phoneNumber, // Group all messages from same number
        providerMessageId: messageSid,
        providerPayload: params,
        status: 'UNREAD',
        requestId,
        attachmentCount: numMedia,
        attachmentMeta: attachments.length > 0 ? attachments : undefined,
      },
    });

    logger.info({ messageSid, from: phoneNumber, userId: user?.id }, 'inbound_whatsapp.received');

    await logAuditActivity({
      action: AuditActions.COMMS_RECEIVE,
      entityType: 'InboundMessage',
      entityId: messageSid,
      entityLabel: `WhatsApp from ${phoneNumber}`,
      actorName: user?.name ?? null,
      actorType: user ? 'user' : 'external',
      actorId: user?.id ?? null,
      metadata: { channel: 'WHATSAPP', from: phoneNumber },
    });

    // Twilio expects TwiML response
    return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
  } catch (err) {
    logger.error({ error: err }, 'twilio_whatsapp.webhook.failed');
    return new NextResponse('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
