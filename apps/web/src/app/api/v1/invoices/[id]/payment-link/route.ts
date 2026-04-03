import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requireRole } from '@/lib/auth/middleware';
import { createPaymentLink } from '@/lib/integrations/stripe/provider';
import { executeTransition } from '@/lib/workflow/engine';
import { createRequestLogger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const start = performance.now();
  try {
    const session = await requireRole(['GOLAB_ADMIN', 'GOLAB_FINANCE', 'SYSTEM']);
    const user = session.user as { id: string; role: string };
    const { id } = await params;
    const requestId = _req.headers.get('x-request-id') ?? crypto.randomUUID();
    const reqLogger = createRequestLogger(requestId, user.id);

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            organization: {
              include: {
                users: {
                  where: { role: { in: ['CUSTOMER_ADMIN', 'CUSTOMER_USER'] } },
                  select: { id: true, email: true, name: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status !== 'ISSUED') {
      return NextResponse.json(
        { error: `Invoice must be in ISSUED status, got ${invoice.status}` },
        { status: 400 },
      );
    }

    // Idempotency: already has payment link
    if (invoice.paymentLinkUrl) {
      return NextResponse.json({
        data: { paymentUrl: invoice.paymentLinkUrl },
        message: 'Payment link already exists',
      });
    }

    const customerUser = invoice.request.organization.users[0];
    if (!customerUser) {
      return NextResponse.json(
        { error: 'No customer user found for this organization' },
        { status: 400 },
      );
    }

    const totalAmountCents = Math.round(parseFloat(invoice.totalAmount.toString()) * 100);

    const paymentResult = await createPaymentLink({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmountCents,
      currency: 'ZAR',
      customerEmail: customerUser.email ?? '',
      customerName: customerUser.name ?? 'Customer',
      organizationName: invoice.request.organization.name,
    });

    // Update invoice with payment link
    await prisma.invoice.update({
      where: { id },
      data: {
        paymentLinkUrl: paymentResult.paymentUrl,
        paymentLinkId: paymentResult.sessionId,
        status: 'PAYMENT_LINK_SENT',
      },
    });

    // Transition request: INVOICE_GENERATED -> AWAITING_COD_PAYMENT
    try {
      await executeTransition({
        entityType: 'Request',
        entityId: invoice.request.id,
        targetStatus: 'AWAITING_COD_PAYMENT',
        triggeredBy: { userId: user.id, role: user.role, type: 'user' },
        reason: `Payment link generated for invoice ${invoice.invoiceNumber}`,
      });
    } catch (err) {
      reqLogger.warn({ error: err }, 'payment-link.transition_skipped');
    }

    reqLogger.info({ invoiceId: id, invoiceNumber: invoice.invoiceNumber }, 'payment-link.created');
    metrics.recordApiRequest(performance.now() - start, {
      route: 'invoices.payment-link',
      status: 'success',
    });

    return NextResponse.json({ data: { paymentUrl: paymentResult.paymentUrl } });
  } catch (error: unknown) {
    metrics.recordApiRequest(performance.now() - start, {
      route: 'invoices.payment-link',
      status: 'error',
    });
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to generate payment link' }, { status: 500 });
  }
}
