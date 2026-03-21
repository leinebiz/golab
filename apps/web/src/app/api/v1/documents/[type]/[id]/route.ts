import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { generateDocument, type DocumentType } from '@/lib/pdf/generator';
import { logger } from '@/lib/observability/logger';

const VALID_TYPES = new Set<DocumentType>(['request-form', 'quote', 'invoice', 'waybill', 'certificate']);

export async function GET(_request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  try {
    await requireAuth();
    const { type, id } = await params;
    if (!VALID_TYPES.has(type as DocumentType)) {
      return NextResponse.json({ error: 'Invalid document type: ' + type }, { status: 400 });
    }
    const html = await generateDocument(type as DocumentType, id);
    return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 });
    if (message.includes('not found')) return NextResponse.json({ error: message }, { status: 404 });
    logger.error({ error }, 'documents.generate.failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
