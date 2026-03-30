import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { logger } from '@/lib/observability/logger';
import { logAuditFromSession, AuditActions } from '@/lib/audit/prisma-audit-middleware';

const ADMIN_ROLES = ['GOLAB_ADMIN', 'GOLAB_REVIEWER', 'GOLAB_FINANCE'];

/**
 * GET /api/v1/admin-messages
 * List messages + system notifications in unified inbox view.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = session.user as { id: string; role: string };
  if (!ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') ?? 'all'; // all, sent, drafts, failed, notifications
  const search = searchParams.get('search') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') ?? '20'));

  try {
    if (tab === 'notifications') {
      // Show system-generated notifications
      const where: Record<string, unknown> = {
        channel: 'EMAIL',
      };
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { body: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                organization: { select: { id: true, name: true } },
              },
            },
            request: { select: { id: true, reference: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.notification.count({ where }),
      ]);

      return NextResponse.json({
        data: notifications.map((n) => ({
          id: n.id,
          type: 'notification' as const,
          channel: n.channel,
          subject: n.title,
          body: n.body,
          status: n.status,
          recipientName: n.user.name,
          recipientEmail: n.user.email,
          organizationName: n.user.organization?.name,
          organizationId: n.user.organization?.id,
          requestRef: n.request?.reference,
          requestId: n.request?.id,
          eventType: n.type,
          sentAt: n.sentAt,
          deliveredAt: n.deliveredAt,
          failureReason: n.failureReason,
          createdAt: n.createdAt,
        })),
        total,
        page,
        pageSize,
      });
    }

    // Admin messages
    const where: Record<string, unknown> = {};
    if (tab === 'drafts') where.status = 'DRAFT';
    else if (tab === 'sent') where.status = { in: ['SENT', 'DELIVERED', 'SENDING'] };
    else if (tab === 'failed') where.status = { in: ['FAILED', 'BOUNCED'] };

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
        { organization: { name: { contains: search, mode: 'insensitive' } } },
        { recipient: { name: { contains: search, mode: 'insensitive' } } },
        { recipient: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [messages, total] = await Promise.all([
      prisma.adminMessage.findMany({
        where,
        include: {
          organization: { select: { id: true, name: true } },
          recipient: { select: { id: true, name: true, email: true } },
          sentBy: { select: { id: true, name: true } },
          request: { select: { id: true, reference: true } },
          _count: { select: { resends: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.adminMessage.count({ where }),
    ]);

    return NextResponse.json({
      data: messages.map((m) => ({
        id: m.id,
        type: 'message' as const,
        channel: m.channel,
        subject: m.subject,
        body: m.body,
        status: m.status,
        recipientName: m.recipient?.name ?? m.organization?.name,
        recipientEmail: m.recipient?.email,
        organizationName: m.organization?.name,
        organizationId: m.organization?.id,
        requestRef: m.request?.reference,
        requestId: m.request?.id,
        sentByName: m.sentBy.name,
        sentAt: m.sentAt,
        deliveredAt: m.deliveredAt,
        failureReason: m.failureReason,
        resendCount: m._count.resends,
        createdAt: m.createdAt,
      })),
      total,
      page,
      pageSize,
    });
  } catch (err) {
    logger.error({ error: err }, 'admin_messages.list.failed');
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

/**
 * POST /api/v1/admin-messages
 * Compose a new message or save a draft.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = session.user as { id: string; role: string };
  if (!ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      organizationId,
      recipientId,
      requestId,
      channel,
      subject,
      body: msgBody,
      action,
    } = body;

    if (!subject || !msgBody) {
      return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 });
    }

    const isDraft = action === 'draft';

    const message = await prisma.adminMessage.create({
      data: {
        organizationId: organizationId || null,
        recipientId: recipientId || null,
        requestId: requestId || null,
        sentById: user.id,
        channel: channel ?? 'EMAIL',
        subject,
        body: msgBody,
        status: isDraft ? 'DRAFT' : 'SENDING',
        sentAt: isDraft ? null : new Date(),
      },
      include: {
        organization: { select: { name: true } },
        recipient: { select: { name: true, email: true } },
      },
    });

    if (!isDraft) {
      // Mark as sent (in production, this would enqueue to BullMQ for actual delivery)
      await prisma.adminMessage.update({
        where: { id: message.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    }

    logger.info(
      { messageId: message.id, action: isDraft ? 'drafted' : 'sent' },
      'admin_message.created',
    );

    await logAuditFromSession(session, request.headers, {
      action: isDraft ? AuditActions.COMMS_DRAFT : AuditActions.COMMS_SEND,
      entityType: 'AdminMessage',
      entityId: message.id,
      entityLabel: subject,
      metadata: {
        channel,
        recipientName: message.recipient?.name ?? message.organization?.name,
        recipientEmail: message.recipient?.email,
      },
    });

    return NextResponse.json({ data: message }, { status: 201 });
  } catch (err) {
    logger.error({ error: err }, 'admin_message.create.failed');
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}
