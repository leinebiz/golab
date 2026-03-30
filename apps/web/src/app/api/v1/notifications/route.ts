import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { auth } from '@/lib/auth/config';

/**
 * GET /api/v1/notifications
 *
 * List notifications for the authenticated user.
 * Query params:
 *   - status: 'read' | 'unread' | 'all' (default: 'all')
 *   - limit: number (default: 20, max: 100)
 *   - cursor: string (cursor-based pagination)
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status') ?? 'all';
  const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 100);
  const cursor = searchParams.get('cursor') ?? undefined;

  const readFilter =
    status === 'read' ? { readAt: { not: null } } : status === 'unread' ? { readAt: null } : {};

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      channel: 'PORTAL',
      ...readFilter,
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = notifications.length > limit;
  const items = hasMore ? notifications.slice(0, limit) : notifications;
  const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

  // Count unread for badge
  const unreadCount = await prisma.notification.count({
    where: { userId, channel: 'PORTAL', readAt: null },
  });

  return NextResponse.json({
    notifications: items,
    unreadCount,
    nextCursor,
  });
}
