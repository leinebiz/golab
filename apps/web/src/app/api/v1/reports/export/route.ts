import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@golab/database';
import { requirePermission } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

function escapeCsv(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n'))
    return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(headers: string[], rows: string[][]): string {
  return [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join(
    '\n',
  );
}

export async function GET(request: NextRequest) {
  try {
    await requirePermission('reports', 'read');
    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type') ?? 'operations';
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date();
    const from = searchParams.get('from')
      ? new Date(searchParams.get('from')!)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    let csv: string;
    let filename: string;

    switch (type) {
      case 'operations': {
        const requests = await prisma.request.findMany({
          where: { createdAt: { gte: from, lte: to } },
          select: {
            reference: true,
            status: true,
            turnaroundType: true,
            createdAt: true,
            acceptedAt: true,
            closedAt: true,
            organization: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        csv = toCsv(
          ['Reference', 'Organization', 'Status', 'Turnaround', 'Created', 'Accepted', 'Closed'],
          requests.map((r) => [
            r.reference,
            r.organization.name,
            r.status,
            r.turnaroundType,
            r.createdAt.toISOString(),
            r.acceptedAt?.toISOString() ?? '',
            r.closedAt?.toISOString() ?? '',
          ]),
        );
        filename = 'operations-report';
        break;
      }
      case 'labs': {
        const subRequests = await prisma.subRequest.findMany({
          where: { createdAt: { gte: from, lte: to } },
          select: {
            subReference: true,
            status: true,
            createdAt: true,
            testingCompletedAt: true,
            expectedCompletionAt: true,
            delayReason: true,
            laboratory: { select: { name: true, code: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        csv = toCsv(
          [
            'Sub-Reference',
            'Lab',
            'Code',
            'Status',
            'Created',
            'Testing Completed',
            'Expected',
            'Delay Reason',
          ],
          subRequests.map((sr) => [
            sr.subReference,
            sr.laboratory.name,
            sr.laboratory.code,
            sr.status,
            sr.createdAt.toISOString(),
            sr.testingCompletedAt?.toISOString() ?? '',
            sr.expectedCompletionAt?.toISOString() ?? '',
            sr.delayReason ?? '',
          ]),
        );
        filename = 'lab-performance-report';
        break;
      }
      case 'financial': {
        const invoices = await prisma.invoice.findMany({
          where: { createdAt: { gte: from, lte: to } },
          select: {
            invoiceNumber: true,
            status: true,
            subtotal: true,
            vatAmount: true,
            totalAmount: true,
            dueDate: true,
            paidAt: true,
            issuedAt: true,
            request: { select: { reference: true, organization: { select: { name: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        });
        csv = toCsv(
          [
            'Invoice #',
            'Request Ref',
            'Customer',
            'Status',
            'Subtotal',
            'VAT',
            'Total',
            'Due Date',
            'Issued',
            'Paid',
          ],
          invoices.map((inv) => [
            inv.invoiceNumber,
            inv.request.reference,
            inv.request.organization.name,
            inv.status,
            String(inv.subtotal),
            String(inv.vatAmount),
            String(inv.totalAmount),
            inv.dueDate.toISOString(),
            inv.issuedAt?.toISOString() ?? '',
            inv.paidAt?.toISOString() ?? '',
          ]),
        );
        filename = 'financial-report';
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'reports.export.failed');
    if (message === 'Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
