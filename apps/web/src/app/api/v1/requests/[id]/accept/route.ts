import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requireAuth } from '@/lib/auth/middleware';
import { executeTransition } from '@/lib/workflow/engine';
import { createRequestLogger } from '@/lib/observability/logger';
import { dispatchNotification } from '@/lib/notifications/dispatcher';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const organizationId = user.organizationId as string;
    const userId = user.id as string;
    const role = user.role as string;
    const { id } = await params;

    // Verify the request belongs to the customer's organization
    const request = await prisma.request.findFirst({
      where: { id, organizationId },
    });

    if (!request) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (request.status !== 'PENDING_CUSTOMER_REVIEW') {
      return NextResponse.json(
        { error: 'Request is not in a state that can be accepted' },
        { status: 409 },
      );
    }

    // Enforce quote expiry — reject acceptance of expired quotes
    const quote = await prisma.quote.findUnique({ where: { requestId: id } });
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }
    if (quote.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Quote has expired. Please request a new quote.' },
        { status: 400 },
      );
    }

    await executeTransition({
      entityType: 'Request',
      entityId: id,
      targetStatus: 'ACCEPTED_BY_CUSTOMER',
      triggeredBy: { userId, role, type: 'user' },
      reason: 'Customer accepted quote',
    });

    const reqLogger = createRequestLogger(crypto.randomUUID(), userId);

    // Auto-create invoice from quote
    const reqWithQuote = await prisma.request.findUnique({
      where: { id },
      include: { quote: true, invoice: true, organization: { select: { id: true, name: true } } },
    });

    if (reqWithQuote?.quote && !reqWithQuote.invoice) {
      const createInvoice = async () => {
        return prisma.$transaction(async (tx) => {
          const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const count = await tx.invoice.count();
          const invoiceNumber = `INV-${dateStr}-${String(count + 1).padStart(5, '0')}`;

          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);

          return tx.invoice.create({
            data: {
              requestId: id,
              invoiceNumber,
              status: 'ISSUED',
              subtotal: reqWithQuote.quote!.subtotal,
              vatAmount: reqWithQuote.quote!.vatAmount,
              totalAmount: reqWithQuote.quote!.totalAmount,
              lineItems: reqWithQuote.quote!.lineItems as object,
              dueDate,
              issuedAt: new Date(),
            },
          });
        });
      };

      try {
        await createInvoice();
      } catch (err) {
        if ((err as { code?: string }).code === 'P2002') {
          // Retry once on unique constraint violation (invoice number race)
          await createInvoice();
        } else {
          throw err;
        }
      }

      // Transition: ACCEPTED_BY_CUSTOMER -> INVOICE_GENERATED
      try {
        await executeTransition({
          entityType: 'Request',
          entityId: id,
          targetStatus: 'INVOICE_GENERATED',
          triggeredBy: { userId: 'system', role: 'SYSTEM', type: 'system' },
          reason: 'Auto-generated invoice after quote acceptance',
        });
      } catch (err) {
        reqLogger.warn({ error: err }, 'accept.invoice_transition_skipped');
      }
    }

    // Dispatch notifications (fire-and-forget)
    const orgUsers = await prisma.user.findMany({
      where: { organizationId },
      select: { id: true },
    });
    const recipientIds = orgUsers.map((u) => u.id);

    dispatchNotification('quote.accepted', {
      recipientUserIds: recipientIds,
      requestId: id,
      data: { requestRef: reqWithQuote?.reference ?? id },
    }).catch((err) => reqLogger.error({ error: err }, 'notification.quote_accepted.failed'));

    if (reqWithQuote?.quote && !reqWithQuote.invoice) {
      dispatchNotification('invoice.generated', {
        recipientUserIds: recipientIds,
        requestId: id,
        data: { requestRef: reqWithQuote?.reference ?? id },
      }).catch((err) => reqLogger.error({ error: err }, 'notification.invoice_generated.failed'));
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Invalid transition')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof Error && error.message.startsWith('Guard rejected')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
