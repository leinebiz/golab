import { NextResponse } from 'next/server';
import { createElement } from 'react';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { generatePdf } from '@/lib/pdf/generator';
import { Quote } from '@golab/pdf-templates';
import type { QuoteData } from '@golab/pdf-templates';
import { logger } from '@/lib/observability/logger';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as { id: string; role: string; organizationId: string };
  const { id } = await params;

  try {
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            organization: {
              include: {
                addresses: { where: { isDefault: true }, take: 1 },
                users: { where: { role: 'CUSTOMER_ADMIN' }, take: 1 },
              },
            },
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Org scoping
    const isAdmin = ['GOLAB_ADMIN', 'GOLAB_REVIEWER', 'GOLAB_FINANCE'].includes(user.role);
    if (!isAdmin && quote.request.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const org = quote.request.organization;
    const address = org.addresses[0];
    const contact = org.users[0];
    const rawItems = (quote.lineItems as Array<Record<string, unknown>>) ?? [];
    const lineItems = rawItems
      .filter((item) => item.testName)
      .map((item) => ({
        testName: String(item.testName ?? ''),
        quantity: Number(item.quantity ?? item.qty ?? 1),
        unitPrice: Number(item.unitPrice ?? 0),
        total: Number(item.total ?? 0),
      }));

    const addressStr = address
      ? [address.line1, address.line2, `${address.city}, ${address.province} ${address.postalCode}`]
          .filter(Boolean)
          .join('\n')
      : 'N/A';

    const data: QuoteData = {
      quoteNumber: quote.quoteNumber,
      date: formatDate(quote.createdAt),
      validUntil: formatDate(quote.expiresAt),
      customer: {
        name: org.name,
        contactPerson: contact?.name ?? 'N/A',
        email: contact?.email ?? 'N/A',
        address: addressStr,
      },
      lineItems,
      subtotal: Number(quote.subtotal),
      expediteSurcharge: Number(quote.expediteSurcharge),
      logisticsFee: Number(quote.logisticsCost),
      vatRate: Number(quote.vatRate) * 100,
      vatAmount: Number(quote.vatAmount),
      total: Number(quote.totalAmount),
      currency: 'ZAR',
    };

    const buffer = await generatePdf(createElement(Quote, { data }));
    const bytes = new Uint8Array(buffer);

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${quote.quoteNumber}.pdf"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    logger.error({ error: err, quoteId: id }, 'quote.pdf.generation.failed');
    return NextResponse.json({ error: 'Failed to generate quote PDF' }, { status: 500 });
  }
}
