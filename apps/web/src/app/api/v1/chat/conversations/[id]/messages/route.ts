import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';
import { generateChatResponse } from '@/lib/rag/pipeline';
import { logger } from '@/lib/observability/logger';

const MessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(10000, 'Message too long'),
  escalate: z.boolean().optional(),
});

/** POST /api/v1/chat/conversations/[id]/messages - Send a message and get AI response */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const userId = session.user!.id!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const organizationId = (session.user as any).organizationId as string | undefined;

    const { id: conversationId } = await params;

    // Verify conversation belongs to user
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = MessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const content = parsed.data.content.trim();
    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Handle escalation request
    if (parsed.data.escalate) {
      const escalationMessage = await prisma.chatMessage.create({
        data: {
          conversationId,
          role: 'system',
          content,
        },
      });

      await prisma.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      logger.info({ conversationId, userId, organizationId }, 'chat.escalation.requested');

      return NextResponse.json({ message: escalationMessage });
    }

    // Store user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'user',
        content,
      },
    });

    // Get conversation history (latest 50 messages to bound context size)
    const history = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { role: true, content: true },
    });
    history.reverse();

    const conversationHistory = history
      .filter((m: { role: string; content: string }) => m.role === 'user' || m.role === 'assistant')
      .map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    try {
      const response = await generateChatResponse(content, conversationHistory, {
        organizationId: organizationId ?? conversation.organizationId,
      });

      const assistantMessage = await prisma.chatMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: response.content,
          sources: response.sources.length > 0 ? response.sources : undefined,
        },
      });

      await prisma.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return NextResponse.json({ userMessage, assistantMessage });
    } catch (error) {
      logger.error(
        { conversationId, error: error instanceof Error ? error.message : String(error) },
        'chat.response.error',
      );

      const fallbackMessage = await prisma.chatMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content:
            'I apologize, but I am unable to process your request right now. Please try again or contact GoLab support directly.',
        },
      });

      return NextResponse.json({ userMessage, assistantMessage: fallbackMessage });
    }
  } catch (error) {
    return handleApiError(error, 'chat.messages.create.failed');
  }
}
