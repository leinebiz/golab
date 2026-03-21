import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';

/**
 * PUT /api/v1/notifications/read-all
 *
 * Mark all portal notifications as read for the authenticated user.
 */
export async function PUT(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await prisma.notification.updateMany({
    where: {
      userId,
      channel: 'PORTAL',
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ markedRead: result.count });
}
