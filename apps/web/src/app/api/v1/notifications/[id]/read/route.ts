import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';

/**
 * PUT /api/v1/notifications/[id]/read
 *
 * Mark a single notification as read.
 */
export { PATCH as PUT };

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });

  if (!notification) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ notification: updated });
}
