import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { auth } from '@/lib/auth/config';

/**
 * PUT /api/v1/notifications/read-all
 *
 * Mark all portal notifications as read for the authenticated user.
 */
export { PATCH as PUT };

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

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
