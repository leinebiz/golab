import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/observability/logger';
import { generateEmbedding } from './ingest';

// Lazy singleton -- created on first use, reused across requests
let anthropicClient: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic();
  }
  return anthropicClient;
}

export interface RelevantChunk {
  id: string;
  sourceType: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

/**
 * Find the top-k most similar document chunks for a query using pgvector cosine distance.
 */
export async function findRelevantChunks(
  query: string,
  topK: number = 5,
): Promise<RelevantChunk[]> {
  const queryEmbedding = await generateEmbedding(query);
  const vectorStr = `[${queryEmbedding.join(',')}]`;

  const results: RelevantChunk[] = await prisma.$queryRaw`
    SELECT
      id,
      "sourceType",
      "sourceId",
      "chunkIndex",
      content,
      1 - (embedding <=> ${vectorStr}::vector) as similarity
    FROM "DocumentEmbedding"
    ORDER BY embedding <=> ${vectorStr}::vector
    LIMIT ${topK}
  `;

  return results;
}

export interface OrgContext {
  organizationId: string;
  organizationName?: string;
}

/**
 * Assemble context from the user's organization data and relevant document chunks.
 */
async function assembleContext(orgContext: OrgContext, chunks: RelevantChunk[]): Promise<string> {
  const parts: string[] = [];

  const recentRequests = await prisma.request.findMany({
    where: { organizationId: orgContext.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      reference: true,
      status: true,
      createdAt: true,
    },
  });

  if (recentRequests.length > 0) {
    parts.push('Recent testing requests for this organization:');
    for (const req of recentRequests) {
      parts.push(
        `- ${req.reference}: status ${req.status} (created ${req.createdAt.toISOString().split('T')[0]})`,
      );
    }
    parts.push('');
  }

  if (chunks.length > 0) {
    parts.push('Relevant documentation:');
    for (const chunk of chunks) {
      parts.push(`[Source: ${chunk.sourceType}/${chunk.sourceId}]`);
      parts.push(chunk.content);
      parts.push('');
    }
  }

  return parts.join('\n');
}

/**
 * Deduplicate sources from chunks by sourceType + sourceId.
 */
function deduplicateSources(
  chunks: RelevantChunk[],
): Array<{ sourceType: string; sourceId: string }> {
  const seen = new Set<string>();
  const result: Array<{ sourceType: string; sourceId: string }> = [];
  for (const c of chunks) {
    const key = `${c.sourceType}:${c.sourceId}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ sourceType: c.sourceType, sourceId: c.sourceId });
    }
  }
  return result;
}

/**
 * Build the messages array for the Claude API from conversation history and context.
 */
function buildMessages(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: string,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  const augmentedMessage = context
    ? `Context:\n${context}\n\nUser question: ${userMessage}`
    : userMessage;
  messages.push({ role: 'user', content: augmentedMessage });

  return messages;
}

const SYSTEM_PROMPT = `You are a helpful support assistant for GoLab, a B2B laboratory sample testing portal. You help customers with:
- Understanding their testing request statuses
- Explaining laboratory testing procedures and turnaround times
- Navigating the GoLab portal features
- Answering questions about sample submission, packaging, and logistics
- Explaining test results and certificates

When answering, use the provided context about the customer's organization and relevant documentation.
If you reference information from the documentation, cite the source.
If you don't know the answer, say so honestly and suggest contacting GoLab support directly.
Keep responses concise and professional.`;

export interface ChatResponse {
  content: string;
  sources: Array<{ sourceType: string; sourceId: string }>;
}

/**
 * Run the full RAG pipeline: embed query, retrieve chunks, assemble context, call Claude.
 */
export async function generateChatResponse(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  orgContext: OrgContext,
): Promise<ChatResponse> {
  logger.info(
    { organizationId: orgContext.organizationId, messageLength: userMessage.length },
    'rag.pipeline.start',
  );

  const chunks = await findRelevantChunks(userMessage);
  const context = await assembleContext(orgContext, chunks);
  const messages = buildMessages(userMessage, conversationHistory, context);

  const response = await getAnthropicClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  });

  const content = response.content[0].type === 'text' ? response.content[0].text : '';

  const sources = deduplicateSources(chunks);

  logger.info(
    {
      organizationId: orgContext.organizationId,
      chunksUsed: chunks.length,
      responseLength: content.length,
    },
    'rag.pipeline.complete',
  );

  return { content, sources };
}
