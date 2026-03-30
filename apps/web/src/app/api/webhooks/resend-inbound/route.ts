import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/observability/logger';
import { logAuditActivity, AuditActions } from '@/lib/audit/prisma-audit-middleware';
import { checkRateLimit, rateLimitResponse } from '@/lib/security/rate-limiter';

/**
 * POST /api/webhooks/resend-inbound
 *
 * Receives inbound emails from Resend's inbound webhook.
 * Resend forwards emails sent to your domain (e.g. reply@golab.co.za)
 * to this endpoint.
 *
 * Setup:
 * 1. Configure MX records for your inbound domain to point to Resend
 * 2. Set RESEND_INBOUND_WEBHOOK_SECRET env var for signature verification
 * 3. Register this URL in Resend dashboard: https://yourapp.com/api/webhooks/resend-inbound
 *
 * Payload shape (Resend inbound email event):
 * {
 *   type: "email.received",
 *   data: {
 *     email_id: string,
 *     from: string,        // "John Smith <john@example.com>"
 *     to: string[],
 *     cc: string[],
 *     subject: string,
 *     text: string,
 *     html: string,
 *     reply_to: string,
 *     in_reply_to: string,  // Message-ID header of the email being replied to
 *     references: string,   // References header chain
 *     attachments: Array<{ filename, content_type, size }>,
 *     headers: Record<string, string>,
 *   }
 * }
 */
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed, resetAt } = checkRateLimit(ip, 'webhook');
  if (!allowed) return rateLimitResponse(resetAt);

  try {
    // Read body as text so we can use it for both signature verification and parsing
    const rawBody = await request.text();

    // Verify webhook signature (Resend uses Svix)
    const webhookSecret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const svixId = request.headers.get('svix-id');
      const svixTimestamp = request.headers.get('svix-timestamp');
      const svixSignature = request.headers.get('svix-signature');

      if (!svixId || !svixTimestamp || !svixSignature) {
        logger.warn('resend_inbound.webhook.missing_signature_headers');
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }

      // Verify Svix HMAC signature
      const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
      const secret = webhookSecret.startsWith('whsec_')
        ? Buffer.from(webhookSecret.split('_')[1], 'base64')
        : Buffer.from(webhookSecret);
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedContent)
        .digest('base64');
      const signatures = svixSignature.split(' ');
      const isValid = signatures.some((sig) => {
        const sigValue = sig.split(',')[1];
        return (
          sigValue && crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(sigValue))
        );
      });
      if (!isValid) {
        logger.warn('resend_inbound.webhook.invalid_signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const { type, data } = payload;

    if (type !== 'email.received') {
      // Only handle inbound emails
      return NextResponse.json({ received: true });
    }

    const emailId = data.email_id;

    // Idempotency: skip if already processed
    const existing = await prisma.inboundMessage.findUnique({
      where: { providerMessageId: emailId },
    });
    if (existing) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Parse sender: "John Smith <john@example.com>" → { name, email }
    const fromMatch = data.from?.match(/^(.+?)\s*<(.+?)>$/);
    const fromName = fromMatch ? fromMatch[1].trim() : null;
    const fromAddress = fromMatch ? fromMatch[2] : data.from;

    // Try to resolve to a GoLab user by email
    const user = fromAddress
      ? await prisma.user.findUnique({
          where: { email: fromAddress.toLowerCase() },
          select: { id: true, organizationId: true },
        })
      : null;

    // Try to resolve related outbound message via In-Reply-To header
    // The In-Reply-To typically contains the Message-ID of the original email
    const relatedMessageId: string | null = null;
    let requestId: string | null = null;
    let threadId: string | null = null;

    if (data.in_reply_to) {
      // Look for an AdminMessage or Notification that this replies to
      // We'd need to store outbound Message-IDs to match, but for now
      // try matching by subject line pattern (Re: <original subject>)
      threadId = data.in_reply_to;
    }

    // If we identified the user, try to find their most recent request for context
    if (user && !requestId) {
      const recentRequest = await prisma.request.findFirst({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      requestId = recentRequest?.id ?? null;
    }

    await prisma.inboundMessage.create({
      data: {
        channel: 'EMAIL',
        fromAddress: fromAddress?.toLowerCase() ?? 'unknown',
        fromName,
        userId: user?.id ?? null,
        organizationId: user?.organizationId ?? null,
        subject: data.subject ?? null,
        body: data.text ?? '',
        bodyHtml: data.html ?? null,
        threadId,
        inReplyTo: data.in_reply_to ?? null,
        references: data.references ?? null,
        relatedMessageId,
        requestId,
        providerMessageId: emailId,
        providerPayload: data,
        status: 'UNREAD',
        attachmentCount: data.attachments?.length ?? 0,
        attachmentMeta:
          data.attachments?.map((a: { filename: string; content_type: string; size: number }) => ({
            name: a.filename,
            contentType: a.content_type,
            size: a.size,
          })) ?? null,
      },
    });

    logger.info(
      { emailId, from: fromAddress, subject: data.subject, userId: user?.id },
      'inbound_email.received',
    );

    await logAuditActivity({
      action: AuditActions.COMMS_RECEIVE,
      entityType: 'InboundMessage',
      entityId: emailId,
      entityLabel: data.subject ?? 'Email',
      actorEmail: fromAddress,
      actorName: fromName,
      actorType: user ? 'user' : 'external',
      actorId: user?.id ?? null,
      metadata: { channel: 'EMAIL', from: fromAddress },
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error({ error: err }, 'resend_inbound.webhook.failed');
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
