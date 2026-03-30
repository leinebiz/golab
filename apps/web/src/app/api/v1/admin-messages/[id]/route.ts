import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { logger } from '@/lib/observability/logger';

const ADMIN_ROLES = ['GOLAB_ADMIN', 'GOLAB_REVIEWER', 'GOLAB_FINANCE'];

/**
 * GET /api/v1/admin-messages/:id
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = session.user as { id: string; role: string };
  if (!ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const message = await prisma.adminMessage.findUnique({
    where: { id },
    include: {
      organization: { select: { id: true, name: true } },
      recipient: { select: { id: true, name: true, email: true } },
      sentBy: { select: { id: true, name: true } },
      request: { select: { id: true, reference: true } },
      resends: {
        orderBy: { createdAt: 'desc' },
        include: { sentBy: { select: { name: true } } },
      },
      parentMessage: {
        select: { id: true, subject: true, sentAt: true },
      },
    },
  });

  if (!message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  return NextResponse.json({ data: message });
}

/**
 * PUT /api/v1/admin-messages/:id — Update draft
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = session.user as { id: string; role: string };
  if (!ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.adminMessage.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  const { subject, body: msgBody, action, organizationId, recipientId, requestId, channel } = body;

  const isSend = action === 'send';

  const message = await prisma.adminMessage.update({
    where: { id },
    data: {
      ...(subject !== undefined && { subject }),
      ...(msgBody !== undefined && { body: msgBody }),
      ...(organizationId !== undefined && { organizationId }),
      ...(recipientId !== undefined && { recipientId }),
      ...(requestId !== undefined && { requestId }),
      ...(channel !== undefined && { channel }),
      ...(isSend && { status: 'SENT', sentAt: new Date() }),
    },
  });

  logger.info({ messageId: id, action: isSend ? 'sent' : 'updated' }, 'admin_message.updated');
  return NextResponse.json({ data: message });
}

/**
 * DELETE /api/v1/admin-messages/:id
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = session.user as { id: string; role: string };
  if (!ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  await prisma.adminMessage.delete({ where: { id } });
  logger.info({ messageId: id }, 'admin_message.deleted');
  return NextResponse.json({ success: true });
}
