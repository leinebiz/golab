import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { createRequestLogger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';
import { auth } from '@/lib/auth/config';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as {
    id: string;
    role: string;
    organizationId: string;
  };
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const reqLogger = createRequestLogger(requestId, user.id);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip = (page - 1) * limit;

  // Org scoping: customers see only their invoices, finance/admin see all
  const isFinanceOrAdmin = ['GOLAB_ADMIN', 'GOLAB_FINANCE'].includes(user.role);
  const orgFilter = isFinanceOrAdmin ? {} : { request: { organizationId: user.organizationId } };

  const where = {
    ...orgFilter,
    ...(status ? { status: status as 'DRAFT' | 'ISSUED' | 'PAID' } : {}),
  };

  const start = performance.now();
  try {
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          request: {
            select: {
              id: true,
              reference: true,
              organizationId: true,
              organization: { select: { id: true, name: true } },
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              status: true,
              confirmedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    metrics.recordApiRequest(performance.now() - start, { route: 'invoices.list' });
    return NextResponse.json({
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    metrics.recordApiRequest(performance.now() - start, {
      route: 'invoices.list',
      status: 'error',
    });
    reqLogger.error(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      'invoices.list.failed',
    );
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as {
    id: string;
    role: string;
    organizationId: string;
  };
  const postRequestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const postLogger = createRequestLogger(postRequestId, user.id);
  const isFinanceOrAdmin = ['GOLAB_ADMIN', 'GOLAB_FINANCE', 'SYSTEM'].includes(user.role);
  if (!isFinanceOrAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { requestId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.requestId) {
    return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
  }

  try {
    const req = await prisma.request.findUnique({
      where: { id: body.requestId },
      include: {
        quote: true,
        invoice: true,
        organization: { select: { id: true, name: true } },
      },
    });

    if (!req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (req.invoice) {
      return NextResponse.json(
        {
          error: 'Invoice already exists for this request',
          invoiceId: req.invoice.id,
        },
        { status: 409 },
      );
    }

    if (!req.quote) {
      return NextResponse.json(
        {
          error: 'No quote found for this request -- cannot generate invoice',
        },
        { status: 400 },
      );
    }

    if (req.status !== 'ACCEPTED_BY_CUSTOMER') {
      return NextResponse.json(
        {
          error: `Request must be in ACCEPTED_BY_CUSTOMER status, got ${req.status}`,
        },
        { status: 400 },
      );
    }

    // Generate invoice number: INV-YYYYMMDD-XXXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${dateStr}-${String(count + 1).padStart(5, '0')}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await prisma.invoice.create({
      data: {
        requestId: req.id,
        invoiceNumber,
        status: 'ISSUED',
        subtotal: req.quote.subtotal,
        vatAmount: req.quote.vatAmount,
        totalAmount: req.quote.totalAmount,
        lineItems: req.quote.lineItems as object,
        dueDate,
        issuedAt: new Date(),
      },
      include: {
        request: {
          select: { id: true, reference: true },
        },
      },
    });

    postLogger.info(
      { invoiceId: invoice.id, invoiceNumber, testingRequestId: req.id },
      'invoice.created',
    );

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (err) {
    postLogger.error(
      {
        error: err instanceof Error ? err.message : 'Unknown error',
        testingRequestId: body.requestId,
      },
      'invoice.create.failed',
    );
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}
