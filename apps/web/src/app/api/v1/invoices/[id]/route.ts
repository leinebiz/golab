import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { logger } from '@/lib/observability/logger';
import { auth } from '@/lib/auth/config';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as {
    id: string;
    role: string;
    organizationId: string;
  };
  const { id } = await params;

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        request: {
          select: {
            id: true,
            reference: true,
            organizationId: true,
            organization: { select: { id: true, name: true } },
            turnaroundType: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Org scoping: customers can only see their own invoices
    const isFinanceOrAdmin = ['GOLAB_ADMIN', 'GOLAB_FINANCE'].includes(user.role);
    if (!isFinanceOrAdmin && invoice.request.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: invoice });
  } catch (err) {
    logger.error({ error: err, invoiceId: id }, 'invoice.detail.failed');
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}
