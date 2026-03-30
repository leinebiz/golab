import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { logger } from '@/lib/observability/logger';

const ADMIN_ROLES = ['GOLAB_ADMIN', 'GOLAB_REVIEWER', 'GOLAB_FINANCE'];

/**
 * POST /api/v1/notifications/:id/resend
 * Resend a failed system notification by creating a new one with PENDING status.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = (session.user as Record<string, unknown>).role as string;
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const original = await prisma.notification.findUnique({
    where: { id },
  });

  if (!original) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  // Reset the original to PENDING so queue workers pick it up again
  const updated = await prisma.notification.update({
    where: { id },
    data: {
      status: 'PENDING',
      sentAt: null,
      deliveredAt: null,
      failureReason: null,
    },
  });

  logger.info({ notificationId: id, type: original.type }, 'notification.resend.queued');

  return NextResponse.json({ data: updated });
}
