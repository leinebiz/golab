import { NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requireAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.user!.id!;

    const count = await prisma.notification.count({
      where: {
        userId,
        channel: 'PORTAL',
        readAt: null,
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    return handleApiError(error, 'notifications.unreadCount.failed');
  }
}
