import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as { role: string };
  if (!['GOLAB_ADMIN', 'GOLAB_FINANCE'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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

  return NextResponse.json(data);
}
