import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';

const ADMIN_ROLES = ['GOLAB_ADMIN', 'GOLAB_REVIEWER', 'GOLAB_FINANCE'];

/**
 * GET /api/v1/inbound-messages
 * List inbound messages for admin inbox. Supports filtering, search, pagination.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = (session.user as Record<string, unknown>).role as string;
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // UNREAD, READ, REPLIED, ARCHIVED, all
  const channel = searchParams.get('channel'); // EMAIL, WHATSAPP, PORTAL
  const search = searchParams.get('search') ?? '';
  const starred = searchParams.get('starred'); // true
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') ?? '20'));
  const countOnly = searchParams.get('countOnly') === 'true';

  const where: Record<string, unknown> = {};

  if (status && status !== 'all') {
    if (status === 'ARCHIVED') {
      where.archivedAt = { not: null };
    } else {
      where.status = status;
      where.archivedAt = null;
    }
  } else {
    where.archivedAt = null; // Default: exclude archived
  }

  if (channel) where.channel = channel;
  if (starred === 'true') where.isStarred = true;

  if (search) {
    where.OR = [
      { subject: { contains: search, mode: 'insensitive' } },
      { body: { contains: search, mode: 'insensitive' } },
      { fromName: { contains: search, mode: 'insensitive' } },
      { fromAddress: { contains: search, mode: 'insensitive' } },
      { organization: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (countOnly) {
    const count = await prisma.inboundMessage.count({
      where: { status: 'UNREAD', archivedAt: null },
    });
    return NextResponse.json({ count });
  }

  const [messages, total] = await Promise.all([
    prisma.inboundMessage.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
        request: { select: { id: true, reference: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inboundMessage.count({ where }),
  ]);

  return NextResponse.json({ data: messages, total, page, pageSize });
}
