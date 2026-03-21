import Stripe from 'stripe';
import { logger } from '@/lib/observability/logger';

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  return new Stripe(secretKey, {
    apiVersion: '2026-02-25.clover',
    typescript: true,
  });
}

interface CreatePaymentLinkParams {
  invoiceId: string;
  invoiceNumber: string;
  totalAmountCents: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  organizationName: string;
  metadata?: Record<string, string>;
}

interface PaymentLinkResult {
  sessionId: string;
  paymentUrl: string;
}

export async function createPaymentLink(
  params: CreatePaymentLinkParams,
): Promise<PaymentLinkResult> {
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: params.customerEmail,
    line_items: [
      {
        price_data: {
          currency: params.currency.toLowerCase(),
          unit_amount: params.totalAmountCents,
          product_data: {
            name: `Invoice ${params.invoiceNumber}`,
            description: `Payment for ${params.organizationName}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      invoiceId: params.invoiceId,
      invoiceNumber: params.invoiceNumber,
      ...params.metadata,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/customer/finances?payment=success&invoice=${params.invoiceNumber}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/customer/finances?payment=cancelled&invoice=${params.invoiceNumber}`,
  });

  logger.info(
    {
      invoiceId: params.invoiceId,
      sessionId: session.id,
      invoiceNumber: params.invoiceNumber,
    },
    'stripe.checkout.session.created',
  );

  return {
    sessionId: session.id,
    paymentUrl: session.url ?? '',
  };
}

export function verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
  }

  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

export function parseWebhookEvent(event: Stripe.Event): {
  type: string;
  sessionId: string | null;
  invoiceId: string | null;
  amountTotal: number | null;
  currency: string | null;
  paymentIntentId: string | null;
  customerEmail: string | null;
} {
  const data = event.data.object as Stripe.Checkout.Session;

  return {
    type: event.type,
    sessionId: data.id ?? null,
    invoiceId: data.metadata?.invoiceId ?? null,
    amountTotal: data.amount_total ?? null,
    currency: data.currency ?? null,
    paymentIntentId: typeof data.payment_intent === 'string' ? data.payment_intent : null,
    customerEmail: data.customer_email ?? null,
  };
}
