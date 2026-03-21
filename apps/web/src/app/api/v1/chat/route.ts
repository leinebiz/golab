import { NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requireAuth } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

/**
 * POST /api/v1/chat — Create a new chat conversation.
 */
export async function POST() {
  try {
    const session = await requireAuth();
    const user = session.user as { id: string; organizationId?: string };

    if (!user.organizationId) {
      return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
    }

    const conversation = await prisma.chatConversation.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
      },
    });

    logger.info({ conversationId: conversation.id, userId: user.id }, 'chat.conversation_created');

    return NextResponse.json(conversation, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error({ error: err instanceof Error ? err.message : String(err) }, 'chat.create_error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
