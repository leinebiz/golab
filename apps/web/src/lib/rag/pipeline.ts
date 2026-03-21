import { prisma } from '@golab/database';
import { logger } from '@/lib/observability/logger';
import { generateEmbedding } from './embeddings';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514';
const MAX_CONTEXT_CHUNKS = 6;
const SIMILARITY_THRESHOLD = 0.3;

interface RetrievedChunk {
  id: string;
  sourceType: string;
  sourceId: string;
  content: string;
  metadata: Record<string, unknown>;
  distance: number;
}

interface ChatContext {
  userId: string;
  organizationId: string;
  conversationId: string;
}

/**
 * Retrieve relevant document chunks using pgvector cosine similarity search.
 */
export async function retrieveChunks(
  query: string,
  limit: number = MAX_CONTEXT_CHUNKS,
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const results = await prisma.$queryRawUnsafe<RetrievedChunk[]>(
    `SELECT
       "id",
       "sourceType",
       "sourceId",
       "content",
       "metadata",
       ("embedding" <=> $1::vector) AS distance
     FROM "DocumentEmbedding"
     WHERE ("embedding" <=> $1::vector) < $2
     ORDER BY "embedding" <=> $1::vector
     LIMIT $3`,
    embeddingStr,
    SIMILARITY_THRESHOLD,
    limit,
  );

  return results;
}

/**
 * Assemble context from retrieved chunks, org data, and request statuses.
 */
async function assembleContext(chunks: RetrievedChunk[], ctx: ChatContext): Promise<string> {
  const parts: string[] = [];

  // Add retrieved document chunks
  if (chunks.length > 0) {
    parts.push('## Relevant Documentation\n');
    for (const chunk of chunks) {
      parts.push(`[Source: ${chunk.sourceType}/${chunk.sourceId}]\n${chunk.content}\n`);
    }
  }

  // Add user's organization context
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      name: true,
      type: true,
      paymentType: true,
    },
  });

  if (org) {
    parts.push(
      `\n## User Organization\nName: ${org.name}\nType: ${org.type}\nPayment: ${org.paymentType}\n`,
    );
  }

  // Add recent request statuses for the user's org
  const recentRequests = await prisma.request.findMany({
    where: { organizationId: ctx.organizationId },
    select: {
      reference: true,
      status: true,
      createdAt: true,
      subRequests: {
        select: {
          subReference: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  if (recentRequests.length > 0) {
    parts.push('\n## Recent Requests\n');
    for (const req of recentRequests) {
      parts.push(
        `- ${req.reference}: ${req.status} (${req.createdAt.toISOString().split('T')[0]})`,
      );
      for (const sub of req.subRequests) {
        parts.push(`  - ${sub.subReference}: ${sub.status}`);
      }
    }
    parts.push('');
  }

  return parts.join('\n');
}

const SYSTEM_PROMPT = `You are GoLab Assistant, the AI support agent for the GoLab B2B laboratory testing portal.

Your scope is strictly limited to:
- GoLab portal features: requests, test catalogue, sample logistics, certificates, invoicing
- Laboratory testing processes and status explanations
- Account management: credit applications, payment types, user roles
- Troubleshooting portal usage issues

Rules:
1. Only answer questions related to GoLab and laboratory testing services.
2. If asked about topics outside your domain, politely redirect to GoLab-related topics.
3. When referencing information from documentation, cite the source.
4. When referencing request statuses, use the exact data provided in the context.
5. If you cannot answer a question confidently, recommend the user escalate to human support.
6. Be concise and professional. Use bullet points for multi-step instructions.
7. Never fabricate request statuses, test results, or pricing information.`;

/**
 * Stream a chat response using the RAG pipeline.
 * Returns a ReadableStream of server-sent events.
 */
export async function streamChatResponse(
  messages: Array<{ role: string; content: string }>,
  ctx: ChatContext,
): Promise<ReadableStream<Uint8Array>> {
  const latestUserMessage = [...messages].reverse().find((m) => m.role === 'user');

  if (!latestUserMessage) {
    throw new Error('No user message found');
  }

  // Retrieve relevant chunks
  const chunks = await retrieveChunks(latestUserMessage.content);

  logger.info(
    {
      conversationId: ctx.conversationId,
      chunkCount: chunks.length,
      distances: chunks.map((c) => c.distance),
    },
    'rag.chunks_retrieved',
  );

  // Assemble context
  const contextText = await assembleContext(chunks, ctx);

  // Build messages for Claude API
  const apiMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Inject context into the latest user message
  const lastIdx = apiMessages.length - 1;
  if (contextText) {
    apiMessages[lastIdx] = {
      ...apiMessages[lastIdx],
      content: `<context>\n${contextText}\n</context>\n\n${apiMessages[lastIdx].content}`,
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: apiMessages,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const body = await response.text();
    logger.error(
      { status: response.status, body, conversationId: ctx.conversationId },
      'rag.anthropic_error',
    );
    throw new Error(`Anthropic API returned ${response.status}`);
  }

  // Build sources metadata for citation
  const sources = chunks.map((c) => ({
    sourceType: c.sourceType,
    sourceId: c.sourceId,
    distance: c.distance,
  }));

  // Transform the Anthropic SSE stream into our own SSE format
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Send sources as the first event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`),
      );

      const reader = response.body!.getReader();
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
            if (data === '[DONE]') continue;

            try {
              const event = JSON.parse(data);
              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: 'text', text: event.delta.text })}\n\n`,
                  ),
                );
              }
              if (event.type === 'message_stop') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }

        // Ensure a done event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
      } catch (err) {
        logger.error(
          {
            error: err instanceof Error ? err.message : String(err),
            conversationId: ctx.conversationId,
          },
          'rag.stream_error',
        );
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'error', error: 'Stream interrupted' })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return readable;
}
