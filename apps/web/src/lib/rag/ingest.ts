import { prisma } from '@/lib/db';
import { logger } from '@/lib/observability/logger';

const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 50;

/**
 * Split text into chunks of approximately `maxTokens` tokens with overlap.
 * Uses whitespace-based tokenizer (1 token ~ 1 word) as an approximation.
 */
export function chunkText(
  text: string,
  maxTokens: number = CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxTokens) {
    return [words.join(' ')];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + maxTokens, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end >= words.length) break;
    start += maxTokens - overlap;
  }

  return chunks;
}

/**
 * Generate an embedding vector for the given text.
 * Placeholder: returns a deterministic 1536-dim vector based on text hash.
 * Replace with actual Voyage/OpenAI embedding API call in production.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const dim = 1536;
  const vector = new Array<number>(dim);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  for (let i = 0; i < dim; i++) {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    vector[i] = (hash / 0x7fffffff) * 2 - 1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map((v) => v / magnitude);
}

export interface IngestDocumentParams {
  sourceType: string;
  sourceId: string;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Ingest a document: chunk it, generate embeddings, and store in the database.
 */
export async function ingestDocument({
  sourceType,
  sourceId,
  content,
  metadata,
}: IngestDocumentParams): Promise<{ chunksCreated: number }> {
  const chunks = chunkText(content);

  logger.info({ sourceType, sourceId, chunkCount: chunks.length }, 'rag.ingest.start');

  // Delete existing embeddings for this source to allow re-ingestion
  await prisma.$executeRaw`
    DELETE FROM "DocumentEmbedding"
    WHERE "sourceType" = ${sourceType} AND "sourceId" = ${sourceId}
  `;

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i]);
    const vectorStr = `[${embedding.join(',')}]`;

    await prisma.$executeRaw`
      INSERT INTO "DocumentEmbedding" ("id", "sourceType", "sourceId", "chunkIndex", "content", "embedding", "metadata", "createdAt")
      VALUES (
        gen_random_uuid()::text,
        ${sourceType},
        ${sourceId},
        ${i},
        ${chunks[i]},
        ${vectorStr}::vector,
        ${metadata ? JSON.stringify(metadata) : null}::jsonb,
        NOW()
      )
    `;
  }

  logger.info({ sourceType, sourceId, chunkCount: chunks.length }, 'rag.ingest.complete');

  return { chunksCreated: chunks.length };
}
