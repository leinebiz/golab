import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { generateChatResponse } from '@/lib/rag/pipeline';
import { logger } from '@/lib/observability/logger';

/** POST /api/v1/chat/conversations/[id]/messages - Send a message and get AI response */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: conversationId } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string | undefined;

  // Verify conversation belongs to user
  const conversation = await prisma.chatConversation.findFirst({
    where: {
      id: conversationId,
      userId: session.user.id,
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const body = await request.json();
  const content = typeof body.content === 'string' ? body.content.trim() : '';

  if (!content) {
    return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
  }

  // Handle escalation request
  if (body.escalate) {
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

    logger.info(
      { conversationId, userId: session.user.id, organizationId },
      'chat.escalation.requested',
    );

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

  // Get conversation history
  const history = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    select: { role: true, content: true },
  });

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
}
