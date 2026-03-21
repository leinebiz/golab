import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const body = await request.json();
    const { version } = body;
    if (!version || typeof version !== 'string') {
      return NextResponse.json({ error: 'version is required' }, { status: 400 });
    }
    logger.info({ userId: user?.id, version }, 'whats-new.marked-read');
    return NextResponse.json({ data: { lastViewedVersion: version } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 });
    logger.error({ error }, 'whats-new.mark-read.failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
