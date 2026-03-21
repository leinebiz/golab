import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requireAuth } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

/**
 * GET /api/v1/chat/conversations — List the current user's conversations.
 */
export async function GET() {
  try {
    const session = await requireAuth();
    const user = session.user as { id: string };

    const conversations = await prisma.chatConversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        isResolved: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json(conversations);
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error(
      { error: err instanceof Error ? err.message : String(err) },
      'chat.list_conversations_error',
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/v1/chat/conversations — Handle support actions (e.g., escalation).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const user = session.user as { id: string; organizationId?: string };

    const body = await request.json();
    const { conversationId, action } = body as {
      conversationId: string;
      action: string;
    };

    if (action === 'escalate') {
      // Verify ownership
      const conversation = await prisma.chatConversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation || conversation.userId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Create a support ticket via audit log (a SupportTicket model
      // can be added later; for now we record the escalation as an audit entry)
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorType: 'user',
          action: 'CHAT_ESCALATED',
          entityType: 'ChatConversation',
          entityId: conversationId,
          metadata: {
            organizationId: user.organizationId,
            escalatedAt: new Date().toISOString(),
          },
        },
      });

      // Mark conversation as resolved (escalated)
      await prisma.chatConversation.update({
        where: { id: conversationId },
        data: { isResolved: true },
      });

      logger.info({ conversationId, userId: user.id }, 'chat.escalated');

      return NextResponse.json({ status: 'escalated' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error({ error: err instanceof Error ? err.message : String(err) }, 'chat.action_error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
