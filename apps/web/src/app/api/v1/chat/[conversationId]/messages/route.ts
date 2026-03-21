import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requireAuth } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';
import { streamChatResponse } from '@/lib/rag/pipeline';

/**
 * POST /api/v1/chat/[conversationId]/messages — Send a message and stream the AI response.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const session = await requireAuth();
    const user = session.user as { id: string; organizationId?: string };
    const { conversationId } = await params;

    const body = await request.json();
    const content = body.content as string;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Verify conversation ownership
    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Store the user message
    await prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: content.trim(),
      },
    });

    // Load conversation history for context
    const history = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    });

    // Stream the AI response
    const stream = await streamChatResponse(history, {
      userId: user.id,
      organizationId: conversation.organizationId,
      conversationId,
    });

    // Collect the full response for storage (tee the stream)
    const [browserStream, storageStream] = stream.tee();

    // Store the assistant response asynchronously after streaming completes
    void storeAssistantResponse(storageStream, conversationId);

    logger.info(
      { conversationId, userId: user.id, historyLength: history.length },
      'chat.message_sent',
    );

    return new Response(browserStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error({ error: err instanceof Error ? err.message : String(err) }, 'chat.message_error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Read the tee'd stream to collect the full assistant response and persist it.
 */
async function storeAssistantResponse(
  stream: ReadableStream<Uint8Array>,
  conversationId: string,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let sources: unknown = null;
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data) continue;
        try {
          const event = JSON.parse(data);
          if (event.type === 'text') {
            fullText += event.text;
          } else if (event.type === 'sources') {
            sources = event.sources;
          }
        } catch {
          // Skip malformed events
        }
      }
    }

    if (fullText) {
      await prisma.chatMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: fullText,
          sources: sources ? JSON.parse(JSON.stringify(sources)) : undefined,
        },
      });
    }
  } catch (err) {
    logger.error(
      { error: err instanceof Error ? err.message : String(err), conversationId },
      'chat.store_response_error',
    );
  }
}
