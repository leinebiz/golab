import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';

interface RouteContext {
  params: Promise<{ type: string }>;
}

function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => {
      const str = v?.toString() ?? '';
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
    .join(',');
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(['GOLAB_ADMIN', 'GOLAB_REVIEWER']);
    const { type } = await context.params;
    const { searchParams } = request.nextUrl;
    const days = parseInt(searchParams.get('days') ?? '30', 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10000', 10), 50000);

    let csv = '';
    let filename = '';

    switch (type) {
      case 'requests': {
        const requests = await prisma.request.findMany({
          where: { createdAt: { gte: since } },
          include: {
            organization: { select: { name: true } },
            quote: { select: { totalAmount: true, isAccepted: true } },
            invoice: { select: { totalAmount: true, status: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        csv = toCsvRow([
          'Reference',
          'Status',
          'Organization',
          'Turnaround',
          'Quote Amount',
          'Quote Accepted',
          'Invoice Amount',
          'Invoice Status',
          'Created',
          'Accepted',
          'Closed',
        ]);
        csv += '\n';
        for (const r of requests) {
          csv += toCsvRow([
            r.reference,
            r.status,
            r.organization.name,
            r.turnaroundType,
            r.quote ? r.quote.totalAmount.toString() : '',
            r.quote?.isAccepted ? 'Yes' : 'No',
            r.invoice ? r.invoice.totalAmount.toString() : '',
            r.invoice?.status ?? '',
            r.createdAt.toISOString(),
            r.acceptedAt?.toISOString() ?? '',
            r.closedAt?.toISOString() ?? '',
          ]);
          csv += '\n';
        }
        filename = `requests-export-${days}d.csv`;
        break;
      }

      case 'labs': {
        const subRequests = await prisma.subRequest.findMany({
          where: { createdAt: { gte: since } },
          include: { laboratory: { select: { name: true, code: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        csv = toCsvRow([
          'Sub-Reference',
          'Lab Code',
          'Lab Name',
          'Status',
          'Testing Started',
          'Testing Completed',
          'Created',
        ]);
        csv += '\n';
        for (const sr of subRequests) {
          csv += toCsvRow([
            sr.subReference,
            sr.laboratory.code,
            sr.laboratory.name,
            sr.status,
            sr.testingStartedAt?.toISOString() ?? '',
            sr.testingCompletedAt?.toISOString() ?? '',
            sr.createdAt.toISOString(),
          ]);
          csv += '\n';
        }
        filename = `labs-export-${days}d.csv`;
        break;
      }

      case 'finance': {
        const invoices = await prisma.invoice.findMany({
          where: { createdAt: { gte: since } },
          include: {
            request: {
              select: { reference: true, organization: { select: { name: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        csv = toCsvRow([
          'Invoice Number',
          'Request Ref',
          'Organization',
          'Status',
          'Subtotal',
          'VAT',
          'Total',
          'Issued',
          'Paid',
          'Due',
        ]);
        csv += '\n';
        for (const inv of invoices) {
          csv += toCsvRow([
            inv.invoiceNumber,
            inv.request.reference,
            inv.request.organization.name,
            inv.status,
            inv.subtotal.toString(),
            inv.vatAmount.toString(),
            inv.totalAmount.toString(),
            inv.issuedAt?.toISOString() ?? '',
            inv.paidAt?.toISOString() ?? '',
            inv.dueDate.toISOString(),
          ]);
          csv += '\n';
        }
        filename = `finance-export-${days}d.csv`;
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown export type: ${type}` }, { status: 400 });
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error, 'reports.export.failed');
  }
}
