import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { logger } from '@/lib/observability/logger';

const ADMIN_ROLES = ['GOLAB_ADMIN', 'GOLAB_REVIEWER', 'GOLAB_FINANCE'];

/**
 * POST /api/v1/admin-messages/:id/resend
 * Resend a previously sent/failed message.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = session.user as { id: string; role: string };
  if (!ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const original = await prisma.adminMessage.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      recipientId: true,
      requestId: true,
      channel: true,
      subject: true,
      body: true,
    },
  });

  if (!original) {
    return NextResponse.json({ error: 'Original message not found' }, { status: 404 });
  }

  // Create a new message linked to the original
  const resent = await prisma.adminMessage.create({
    data: {
      organizationId: original.organizationId,
      recipientId: original.recipientId,
      requestId: original.requestId,
      sentById: user.id,
      channel: original.channel,
      subject: original.subject,
      body: original.body,
      status: 'SENT',
      sentAt: new Date(),
      parentMessageId: original.id,
    },
  });

  logger.info({ messageId: resent.id, originalId: original.id }, 'admin_message.resent');

  return NextResponse.json({ data: resent }, { status: 201 });
}
