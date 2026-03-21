import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

interface ReleaseNote { version: string; date: string; title: string; highlights: string[]; type: 'feature' | 'improvement' | 'fix'; }

const RELEASE_NOTES: ReleaseNote[] = [
  { version: '0.2.0', date: '2026-03-21', title: 'PDF Documents & Release Notes', highlights: ['Generate printable request forms, quotes, invoices, waybills, and certificates', 'New "What\'s New" page to track platform updates', 'Conventional commit enforcement and automated changelog generation'], type: 'feature' },
  { version: '0.1.0', date: '2026-03-20', title: 'Wave 1 Foundation', highlights: ['Customer portal with request wizard and quote engine', 'Laboratory portal with sample tracking', 'Admin portal with review queue and test catalogue management', 'Finance portal with invoicing and payment integration'], type: 'feature' },
];

export async function GET() {
  try {
    const session = await requireAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    return NextResponse.json({ data: { releases: RELEASE_NOTES, lastViewedVersion: user?.lastViewedVersion ?? null, latestVersion: RELEASE_NOTES[0]?.version ?? null } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 });
    logger.error({ error }, 'whats-new.list.failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
