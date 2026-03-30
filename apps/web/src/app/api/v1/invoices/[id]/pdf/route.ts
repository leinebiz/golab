import { NextResponse } from 'next/server';
import { createElement } from 'react';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { generatePdf } from '@/lib/pdf/generator';
import { Invoice } from '@golab/pdf-templates';
import type { InvoiceData } from '@golab/pdf-templates';
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
    const invoice = await prisma.invoice.findUnique({
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
            quote: { select: { quoteNumber: true } },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Org scoping
    const isAdmin = ['GOLAB_ADMIN', 'GOLAB_FINANCE'].includes(user.role);
    if (!isAdmin && invoice.request.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const org = invoice.request.organization;
    const address = org.addresses[0];
    const contact = org.users[0];
    const rawItems = (invoice.lineItems as Array<Record<string, unknown>>) ?? [];
    const lineItems = rawItems
      .filter((item) => item.testName || item.label)
      .map((item) => ({
        testName: String(item.testName ?? item.label ?? ''),
        quantity: Number(item.quantity ?? item.qty ?? 1),
        unitPrice: Number(item.unitPrice ?? item.total ?? 0),
        total: Number(item.total ?? 0),
      }));

    const addressStr = address
      ? [address.line1, address.line2, `${address.city}, ${address.province} ${address.postalCode}`]
          .filter(Boolean)
          .join('\n')
      : 'N/A';

    const data: InvoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      quoteNumber: invoice.request.quote?.quoteNumber,
      date: formatDate(invoice.createdAt),
      dueDate: formatDate(invoice.dueDate),
      customer: {
        name: org.name,
        contactPerson: contact?.name ?? 'N/A',
        email: contact?.email ?? 'N/A',
        address: addressStr,
      },
      lineItems,
      subtotal: Number(invoice.subtotal),
      vatRate: 15,
      vatAmount: Number(invoice.vatAmount),
      total: Number(invoice.totalAmount),
      currency: 'ZAR',
      paymentInstructions: {
        bankName: 'First National Bank',
        accountName: 'GoLab (Pty) Ltd',
        accountNumber: '62840972150',
        branchCode: '250655',
        reference: invoice.invoiceNumber,
      },
    };

    const buffer = await generatePdf(createElement(Invoice, { data }));
    const bytes = new Uint8Array(buffer);

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.pdf"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    logger.error({ error: err, invoiceId: id }, 'invoice.pdf.generation.failed');
    return NextResponse.json({ error: 'Failed to generate invoice PDF' }, { status: 500 });
  }
}
