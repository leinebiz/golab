import { prisma } from '@golab/database';
import { renderRequestForm, renderQuote, renderInvoice, renderWaybill, renderCertificate, type RequestFormData, type RequestFormSubRequest, type QuoteData, type QuoteLineItem, type InvoiceData, type InvoiceLineItem, type WaybillData, type CertificateData } from '@golab/pdf-templates';

export type DocumentType = 'request-form' | 'quote' | 'invoice' | 'waybill' | 'certificate';

export async function generateDocument(type: DocumentType, id: string): Promise<string> {
  switch (type) {
    case 'request-form': return generateRequestForm(id);
    case 'quote': return generateQuoteDoc(id);
    case 'invoice': return generateInvoiceDoc(id);
    case 'waybill': return generateWaybillDoc(id);
    case 'certificate': return generateCertificateDoc(id);
    default: throw new Error('Unknown document type: ' + type);
  }
}

async function generateRequestForm(requestId: string): Promise<string> {
  const request = await prisma.request.findUnique({ where: { id: requestId }, include: { organization: true, subRequests: { include: { laboratory: true, tests: { include: { testCatalogue: true, tolerances: true } } } } } });
  if (!request) throw new Error('Request not found');
  const user = await prisma.user.findFirst({ where: { organizationId: request.organizationId }, orderBy: { createdAt: 'asc' } });
  const subs: RequestFormSubRequest[] = request.subRequests.map(sr => ({ subReference: sr.subReference, laboratoryName: sr.laboratory.name, tests: sr.tests.map(t => ({ testName: t.testCatalogue.name, testCode: t.testCatalogue.code, sampleCount: t.sampleCount, accreditationRequired: t.accreditationRequired, unitPrice: t.unitPrice.toString(), totalPrice: t.totalPrice.toString(), toleranceMin: t.tolerances[0]?.minValue?.toString() ?? null, toleranceMax: t.tolerances[0]?.maxValue?.toString() ?? null, toleranceUnit: t.tolerances[0]?.unit ?? null })) }));
  const data: RequestFormData = { reference: request.reference, date: request.createdAt, status: request.status, turnaroundType: request.turnaroundType, specialInstructions: request.specialInstructions, customer: { name: request.organization.name, registrationNumber: request.organization.registrationNumber, vatNumber: request.organization.vatNumber, contactName: user?.name ?? 'Unknown', contactEmail: user?.email ?? 'Unknown', contactPhone: user?.phone ?? null }, subRequests: subs };
  return renderRequestForm(data);
}

async function generateQuoteDoc(requestId: string): Promise<string> {
  const quote = await prisma.quote.findUnique({ where: { requestId }, include: { request: { include: { organization: true } } } });
  if (!quote) throw new Error('Quote not found for this request');
  const user = await prisma.user.findFirst({ where: { organizationId: quote.request.organizationId }, orderBy: { createdAt: 'asc' } });
  const rawItems = (quote.lineItems ?? []) as Array<Record<string, unknown>>;
  const lineItems: QuoteLineItem[] = rawItems.map(i => ({ description: String(i.description ?? ''), testCode: i.testCode ? String(i.testCode) : undefined, laboratory: i.laboratory ? String(i.laboratory) : undefined, quantity: Number(i.quantity ?? 1), unitPrice: String(i.unitPrice ?? '0'), totalPrice: String(i.totalPrice ?? '0') }));
  const data: QuoteData = { quoteNumber: quote.quoteNumber, requestReference: quote.request.reference, date: quote.createdAt, expiresAt: quote.expiresAt, customer: { name: quote.request.organization.name, registrationNumber: quote.request.organization.registrationNumber, vatNumber: quote.request.organization.vatNumber, contactName: user?.name ?? 'Unknown', contactEmail: user?.email ?? 'Unknown' }, lineItems, subtotal: quote.subtotal.toString(), expediteSurcharge: quote.expediteSurcharge.toString(), logisticsCost: quote.logisticsCost.toString(), adminFee: quote.adminFee.toString(), vatRate: quote.vatRate.toString(), vatAmount: quote.vatAmount.toString(), totalAmount: quote.totalAmount.toString() };
  return renderQuote(data);
}

async function generateInvoiceDoc(requestId: string): Promise<string> {
  const invoice = await prisma.invoice.findUnique({ where: { requestId }, include: { request: { include: { organization: true } } } });
  if (!invoice) throw new Error('Invoice not found for this request');
  const user = await prisma.user.findFirst({ where: { organizationId: invoice.request.organizationId }, orderBy: { createdAt: 'asc' } });
  const rawItems = (invoice.lineItems ?? []) as Array<Record<string, unknown>>;
  const lineItems: InvoiceLineItem[] = rawItems.map(i => ({ description: String(i.description ?? ''), quantity: Number(i.quantity ?? 1), unitPrice: String(i.unitPrice ?? '0'), totalPrice: String(i.totalPrice ?? '0') }));
  const data: InvoiceData = { invoiceNumber: invoice.invoiceNumber, requestReference: invoice.request.reference, date: invoice.issuedAt ?? invoice.createdAt, dueDate: invoice.dueDate, status: invoice.status, customer: { name: invoice.request.organization.name, registrationNumber: invoice.request.organization.registrationNumber, vatNumber: invoice.request.organization.vatNumber, contactName: user?.name ?? 'Unknown', contactEmail: user?.email ?? 'Unknown' }, lineItems, subtotal: invoice.subtotal.toString(), vatAmount: invoice.vatAmount.toString(), totalAmount: invoice.totalAmount.toString(), paymentLinkUrl: invoice.paymentLinkUrl };
  return renderInvoice(data);
}

async function generateWaybillDoc(waybillId: string): Promise<string> {
  const waybill = await prisma.waybill.findUnique({ where: { id: waybillId }, include: { subRequest: { include: { request: true } } } });
  if (!waybill) throw new Error('Waybill not found');
  const c = waybill.collectionAddress as Record<string, unknown>;
  const d = waybill.deliveryAddress as Record<string, unknown>;
  const data: WaybillData = { waybillNumber: waybill.waybillNumber, date: waybill.createdAt, courierProvider: waybill.courierProvider, subReference: waybill.subRequest.subReference, requestReference: waybill.subRequest.request.reference, collectionAddress: { line1: String(c.line1 ?? ''), line2: c.line2 ? String(c.line2) : null, city: String(c.city ?? ''), province: String(c.province ?? ''), postalCode: String(c.postalCode ?? '') }, deliveryAddress: { line1: String(d.line1 ?? ''), line2: d.line2 ? String(d.line2) : null, city: String(d.city ?? ''), province: String(d.province ?? ''), postalCode: String(d.postalCode ?? '') }, estimatedDelivery: waybill.estimatedDelivery };
  return renderWaybill(data);
}

async function generateCertificateDoc(certificateId: string): Promise<string> {
  const cert = await prisma.certificate.findUnique({ where: { id: certificateId }, include: { subRequest: { include: { laboratory: true, request: { include: { organization: true } }, tests: { include: { testCatalogue: true, tolerances: true } } } } } });
  if (!cert) throw new Error('Certificate not found');
  const user = await prisma.user.findFirst({ where: { organizationId: cert.subRequest.request.organizationId }, orderBy: { createdAt: 'asc' } });
  const reviewer = cert.reviewedById ? await prisma.user.findUnique({ where: { id: cert.reviewedById } }) : null;
  const data: CertificateData = { certificateNumber: 'CERT-' + cert.id.slice(0, 8).toUpperCase(), date: cert.createdAt, subReference: cert.subRequest.subReference, requestReference: cert.subRequest.request.reference, format: cert.format, laboratory: { name: cert.subRequest.laboratory.name, code: cert.subRequest.laboratory.code }, customer: { name: cert.subRequest.request.organization.name, contactName: user?.name ?? 'Unknown' }, testResults: cert.subRequest.tests.map(t => ({ testName: t.testCatalogue.name, testCode: t.testCatalogue.code, result: '-', toleranceMin: t.tolerances[0]?.minValue?.toString() ?? null, toleranceMax: t.tolerances[0]?.maxValue?.toString() ?? null, toleranceUnit: t.tolerances[0]?.unit ?? null })), reviewedBy: reviewer?.name ?? null, reviewedAt: cert.reviewedAt, notes: cert.reviewNotes };
  return renderCertificate(data);
}
