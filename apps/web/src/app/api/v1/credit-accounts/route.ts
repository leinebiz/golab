import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { createRequestLogger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as { id: string; role: string };
  const reqLogger = createRequestLogger(requestId, user.id);

  if (!['GOLAB_ADMIN', 'GOLAB_FINANCE'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const start = performance.now();
  try {
    const accounts = await prisma.creditAccount.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    const data = accounts.map((a) => ({
      id: a.id,
      organizationId: a.organization.id,
      organizationName: a.organization.name,
      status: a.status,
      creditLimit: a.creditLimit.toString(),
      applicationDate: a.applicationDate?.toISOString() ?? a.createdAt.toISOString(),
      requestedLimit:
        (a.applicationDocs as Record<string, string> | null)?.requestedLimit ??
        a.creditLimit.toString(),
      reason: (a.applicationDocs as Record<string, string> | null)?.reason ?? '',
    }));

    metrics.recordApiRequest(performance.now() - start, { route: 'credit-accounts.list' });
    return NextResponse.json(data);
  } catch (err) {
    metrics.recordApiRequest(performance.now() - start, {
      route: 'credit-accounts.list',
      status: 'error',
    });
    reqLogger.error(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      'credit-accounts.list.failed',
    );
    return NextResponse.json({ error: 'Failed to fetch credit accounts' }, { status: 500 });
  }
}
