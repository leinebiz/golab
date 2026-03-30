import { NextRequest, NextResponse } from 'next/server';
import { getSignedPdfUrl } from '@/lib/pdf/generator';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    await requireAuth();

    const { key } = await params;

    if (!key) {
      return NextResponse.json({ error: 'Missing document key' }, { status: 400 });
    }

    if (key.includes('..') || key.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid document key' }, { status: 400 });
    }

    // The key arrives URL-encoded from the path; decode it
    const decodedKey = decodeURIComponent(key);

    if (decodedKey.includes('..') || decodedKey.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid document key' }, { status: 400 });
    }
    const url = await getSignedPdfUrl(decodedKey);

    return NextResponse.redirect(url);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to retrieve document', details: message },
      { status: 500 },
    );
  }
}
