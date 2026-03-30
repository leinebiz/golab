import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { logger } from '@/lib/observability/logger';

const ADMIN_ROLES = ['GOLAB_ADMIN', 'GOLAB_REVIEWER', 'GOLAB_FINANCE'];

/**
 * GET /api/v1/inbound-messages/:id
 * Get single inbound message detail. Auto-marks as read.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = (session.user as Record<string, unknown>).role as string;
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const message = await prisma.inboundMessage.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, whatsappNumber: true, phone: true } },
      organization: { select: { id: true, name: true } },
      request: { select: { id: true, reference: true } },
    },
  });

  if (!message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  // Auto-mark as read
  if (message.status === 'UNREAD') {
    await prisma.inboundMessage.update({
      where: { id },
      data: { status: 'READ', readAt: new Date() },
    });
  }

  return NextResponse.json({ data: message });
}

/**
 * PATCH /api/v1/inbound-messages/:id
 * Update status (star, archive, mark unread).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = (session.user as Record<string, unknown>).role as string;
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action } = body; // star, unstar, archive, unarchive, markUnread, markReplied

  const data: Record<string, unknown> = {};

  switch (action) {
    case 'star':
      data.isStarred = true;
      break;
    case 'unstar':
      data.isStarred = false;
      break;
    case 'archive':
      data.archivedAt = new Date();
      data.status = 'ARCHIVED';
      break;
    case 'unarchive':
      data.archivedAt = null;
      data.status = 'READ';
      break;
    case 'markUnread':
      data.status = 'UNREAD';
      data.readAt = null;
      break;
    case 'markReplied':
      data.status = 'REPLIED';
      data.repliedAt = new Date();
      break;
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const message = await prisma.inboundMessage.update({
    where: { id },
    data,
  });

  logger.info({ inboundMessageId: id, action }, 'inbound_message.action');
  return NextResponse.json({ data: message });
}
