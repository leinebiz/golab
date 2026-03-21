import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requireAuth } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

/**
 * GET /api/v1/chat/[conversationId] — Get conversation with message history.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const session = await requireAuth();
    const user = session.user as { id: string };
    const { conversationId } = await params;

    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Ensure the user owns this conversation
    if (conversation.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(conversation);
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error(
      { error: err instanceof Error ? err.message : String(err) },
      'chat.get_conversation_error',
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
