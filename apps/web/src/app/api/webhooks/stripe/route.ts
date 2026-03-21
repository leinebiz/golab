import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { logger } from '@/lib/observability/logger';
import { verifyWebhookSignature, parseWebhookEvent } from '@/lib/integrations/stripe/provider';
import { executeTransition } from '@/lib/workflow/engine';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    logger.warn('stripe.webhook.missing_signature');
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    logger.error('stripe.webhook.body_read_failed');
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 });
  }

  let event;
  try {
    event = verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    logger.error({ error: err }, 'stripe.webhook.signature_invalid');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const parsed = parseWebhookEvent(event);

  logger.info(
    {
      eventType: parsed.type,
      sessionId: parsed.sessionId,
      invoiceId: parsed.invoiceId,
    },
    'stripe.webhook.received',
  );

  if (event.type === 'checkout.session.completed') {
    if (!parsed.invoiceId) {
      logger.warn({ sessionId: parsed.sessionId }, 'stripe.webhook.missing_invoice_id');
      return NextResponse.json({ received: true });
    }

    try {
      await handleCheckoutCompleted(parsed);
    } catch (err) {
      logger.error(
        { error: err, invoiceId: parsed.invoiceId },
        'stripe.webhook.checkout_completed.failed',
      );
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(parsed: {
  invoiceId: string | null;
  sessionId: string | null;
  amountTotal: number | null;
  currency: string | null;
  paymentIntentId: string | null;
  customerEmail: string | null;
}) {
  if (!parsed.invoiceId) return;

  // Idempotency: check if payment already recorded for this session
  const existingPayment = await prisma.payment.findFirst({
    where: { providerPaymentId: parsed.sessionId },
  });

  if (existingPayment) {
    logger.info(
      { sessionId: parsed.sessionId, paymentId: existingPayment.id },
      'stripe.webhook.duplicate_ignored',
    );
    return;
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: parsed.invoiceId },
    include: { request: true },
  });

  if (!invoice) {
    logger.error({ invoiceId: parsed.invoiceId }, 'stripe.webhook.invoice_not_found');
    return;
  }

  // Convert cents to currency units for storage (Decimal in DB)
  const amountDecimal =
    parsed.amountTotal !== null
      ? (parsed.amountTotal / 100).toFixed(2)
      : invoice.totalAmount.toString();

  await prisma.$transaction(async (tx) => {
    // Record the payment
    await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: amountDecimal,
        currency: parsed.currency?.toUpperCase() ?? 'ZAR',
        status: 'CONFIRMED',
        provider: 'stripe',
        providerPaymentId: parsed.sessionId,
        providerData: {
          paymentIntentId: parsed.paymentIntentId,
          customerEmail: parsed.customerEmail,
        },
        confirmedAt: new Date(),
      },
    });

    // Update invoice status
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentReference: parsed.sessionId,
      },
    });
  });

  // Trigger workflow transition: AWAITING_COD_PAYMENT -> PAYMENT_RECEIVED
  if (invoice.request.status === 'AWAITING_COD_PAYMENT') {
    try {
      await executeTransition({
        entityType: 'Request',
        entityId: invoice.request.id,
        targetStatus: 'PAYMENT_RECEIVED',
        triggeredBy: {
          userId: 'system',
          role: 'SYSTEM',
          type: 'webhook',
        },
        reason: `Stripe payment confirmed: ${parsed.sessionId}`,
        metadata: {
          paymentIntentId: parsed.paymentIntentId,
          stripeSessionId: parsed.sessionId,
        },
      });

      logger.info(
        { requestId: invoice.request.id, invoiceId: invoice.id },
        'stripe.webhook.transition_to_payment_received',
      );
    } catch (err) {
      logger.error(
        { error: err, requestId: invoice.request.id },
        'stripe.webhook.transition_failed',
      );
    }
  }
}
