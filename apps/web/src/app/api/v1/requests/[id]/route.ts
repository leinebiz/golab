import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const organizationId = user.organizationId as string;
    const { id } = await params;

    const request = await prisma.request.findFirst({
      where: { id, organizationId },
      include: {
        subRequests: {
          include: {
            laboratory: { select: { id: true, name: true } },
            tests: {
              include: {
                testCatalogue: { select: { name: true, code: true } },
              },
            },
            certificates: {
              select: {
                id: true,
                fileName: true,
                format: true,
                releasedAt: true,
                reviewAction: true,
              },
            },
            waybill: {
              select: {
                id: true,
                waybillNumber: true,
                status: true,
                pdfKey: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            totalAmount: true,
            isAccepted: true,
            expiresAt: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            status: true,
            pdfKey: true,
          },
        },
        statusTransitions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!request) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data = {
      id: request.id,
      reference: request.reference,
      status: request.status,
      turnaroundType: request.turnaroundType,
      specialInstructions: request.specialInstructions,
      customerAction: request.customerAction,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      acceptedAt: request.acceptedAt?.toISOString() ?? null,
      closedAt: request.closedAt?.toISOString() ?? null,
      subRequests: request.subRequests.map((sr) => ({
        id: sr.id,
        subReference: sr.subReference,
        labName: sr.laboratory.name,
        status: sr.status,
        expectedCompletionAt: sr.expectedCompletionAt?.toISOString() ?? null,
        tests: sr.tests.map((t) => ({
          id: t.id,
          testName: t.testCatalogue.name,
          testCode: t.testCatalogue.code,
          sampleCount: t.sampleCount,
        })),
        certificates: sr.certificates.map((c) => ({
          id: c.id,
          fileName: c.fileName,
          format: c.format,
          releasedAt: c.releasedAt?.toISOString() ?? null,
        })),
        waybill: sr.waybill
          ? {
              id: sr.waybill.id,
              waybillNumber: sr.waybill.waybillNumber,
              status: sr.waybill.status,
            }
          : null,
      })),
      quote: request.quote
        ? {
            id: request.quote.id,
            quoteNumber: request.quote.quoteNumber,
            totalAmount: request.quote.totalAmount.toString(),
            isAccepted: request.quote.isAccepted,
            expiresAt: request.quote.expiresAt.toISOString(),
          }
        : null,
      invoice: request.invoice
        ? {
            id: request.invoice.id,
            invoiceNumber: request.invoice.invoiceNumber,
            totalAmount: request.invoice.totalAmount.toString(),
            status: request.invoice.status,
          }
        : null,
      transitions: request.statusTransitions.map((t) => ({
        id: t.id,
        fromStatus: t.fromStatus,
        toStatus: t.toStatus,
        triggeredBy: t.triggeredBy,
        reason: t.reason,
        createdAt: t.createdAt.toISOString(),
      })),
      documents: buildDocumentList(request),
    };

    return NextResponse.json({ data });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface RequestWithRelations {
  id: string;
  reference: string;
  quote: { id: string; quoteNumber: string } | null;
  invoice: { id: string; invoiceNumber: string; pdfKey: string | null } | null;
  subRequests: Array<{
    waybill: { id: string; waybillNumber: string; pdfKey: string | null } | null;
  }>;
}

function buildDocumentList(request: RequestWithRelations) {
  const docs: Array<{ type: string; label: string; url: string }> = [];

  if (request.quote) {
    docs.push({
      type: 'quote',
      label: `Quote ${request.quote.quoteNumber}`,
      url: `/api/v1/documents/quote/${request.quote.id}`,
    });
  }

  if (request.invoice) {
    docs.push({
      type: 'invoice',
      label: `Invoice ${request.invoice.invoiceNumber}`,
      url: `/api/v1/documents/invoice/${request.invoice.id}`,
    });
  }

  for (const sr of request.subRequests) {
    if (sr.waybill) {
      docs.push({
        type: 'waybill',
        label: `Waybill ${sr.waybill.waybillNumber}`,
        url: `/api/v1/documents/waybill/${sr.waybill.id}`,
      });
    }
  }

  return docs;
}
