import { NextRequest, NextResponse } from 'next/server';
import { getSignedPdfUrl } from '@/lib/pdf/generator';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;

    if (!key) {
      return NextResponse.json({ error: 'Missing document key' }, { status: 400 });
    }

    // The key arrives URL-encoded from the path; decode it
    const decodedKey = decodeURIComponent(key);
    const url = await getSignedPdfUrl(decodedKey);

    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to retrieve document', details: message },
      { status: 500 },
    );
  }
}
