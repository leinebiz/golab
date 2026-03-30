import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';

const ADMIN_ROLES = ['GOLAB_ADMIN', 'GOLAB_REVIEWER', 'GOLAB_FINANCE'];

/**
 * GET /api/v1/audit-log/users
 * Returns distinct actors who appear in the audit log.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = (session.user as Record<string, unknown>).role as string;
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.auditLog.findMany({
    where: { actorEmail: { not: null } },
    select: { actorEmail: true, actorName: true },
    distinct: ['actorEmail'],
    orderBy: { actorEmail: 'asc' },
  });

  return NextResponse.json({ data: users });
}
