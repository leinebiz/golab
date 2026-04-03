import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requireAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';

/**
 * PUT /api/v1/notifications/read-all
 *
 * Mark all portal notifications as read for the authenticated user.
 */
export { PATCH as PUT };

export async function PATCH(_request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user!.id!;

    const result = await prisma.notification.updateMany({
      where: {
        userId,
        channel: 'PORTAL',
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ markedRead: result.count });
  } catch (error) {
    return handleApiError(error, 'notifications.readAll.failed');
  }
}
