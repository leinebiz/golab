import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { generatePdf, storePdf } from '@/lib/pdf/generator';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@golab/database';
import { RequestForm, Quote, Invoice, Certificate } from '@golab/pdf-templates';
import type {
  RequestFormData,
  QuoteData,
  InvoiceData,
  CertificateData,
} from '@golab/pdf-templates';

type DocumentType = 'request-form' | 'quote' | 'invoice' | 'certificate';

interface GenerateRequest {
  type: DocumentType;
  requestId?: string;
  data: RequestFormData | QuoteData | InvoiceData | CertificateData;
}

function buildTemplate(type: DocumentType, data: unknown): React.ReactElement {
  switch (type) {
    case 'request-form':
      return React.createElement(RequestForm, {
        data: data as RequestFormData,
      });
    case 'quote':
      return React.createElement(Quote, { data: data as QuoteData });
    case 'invoice':
      return React.createElement(Invoice, { data: data as InvoiceData });
    case 'certificate':
      return React.createElement(Certificate, {
        data: data as CertificateData,
      });
    default:
      throw new Error(`Unknown document type: ${type}`);
  }
}

function buildS3Key(type: DocumentType, data: Record<string, unknown>): string {
  const id =
    data.requestNumber ??
    data.quoteNumber ??
    data.invoiceNumber ??
    data.certificateNumber ??
    crypto.randomUUID();
  const timestamp = Date.now();
  return `documents/${type}/${String(id)}-${timestamp}.pdf`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([
      'GOLAB_ADMIN',
      'GOLAB_REVIEWER',
      'CUSTOMER_ADMIN',
      'CUSTOMER_USER',
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const userRole = user.role as string;
    const userOrgId = user.organizationId as string | undefined;

    const body = (await request.json()) as GenerateRequest;

    if (!body.type || !body.data) {
      return NextResponse.json({ error: 'Missing required fields: type, data' }, { status: 400 });
    }

    // Ownership check for customer roles
    if (['CUSTOMER_ADMIN', 'CUSTOMER_USER'].includes(userRole)) {
      if (!body.requestId) {
        return NextResponse.json(
          { error: 'requestId is required for customer users' },
          { status: 400 },
        );
      }
      const linkedRequest = await prisma.request.findUnique({
        where: { id: body.requestId },
        select: { organizationId: true },
      });
      if (!linkedRequest || linkedRequest.organizationId !== userOrgId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const validTypes: DocumentType[] = ['request-form', 'quote', 'invoice', 'certificate'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid document type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 },
      );
    }

    const template = buildTemplate(body.type, body.data);
    const buffer = await generatePdf(template);
    const key = buildS3Key(body.type, body.data as unknown as Record<string, unknown>);
    await storePdf(key, buffer);

    return NextResponse.json({ key, size: buffer.length }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate document', details: message },
      { status: 500 },
    );
  }
}
