import { prisma } from '@golab/database';
import { logger } from '@/lib/observability/logger';
import { generateEmbeddings } from './embeddings';

/** Target chunk size in characters (approximation of 512 tokens). */
const CHUNK_SIZE = 2048;
/** Overlap in characters (approximation of 50 tokens). */
const CHUNK_OVERLAP = 200;

interface DocumentMetadata {
  sourceType: string;
  sourceId: string;
  title?: string;
  [key: string]: unknown;
}

/**
 * Split text into overlapping chunks suitable for embedding.
 */
export function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length);

    // Try to break at a sentence or paragraph boundary
    if (end < text.length) {
      const slice = text.slice(start, end);
      const lastBreak = Math.max(
        slice.lastIndexOf('\n\n'),
        slice.lastIndexOf('. '),
        slice.lastIndexOf('.\n'),
      );
      if (lastBreak > CHUNK_SIZE * 0.5) {
        end = start + lastBreak + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - CHUNK_OVERLAP;
    if (start < 0) start = 0;
    // Prevent infinite loop if end hasn't advanced
    if (end >= text.length) break;
  }

  return chunks;
}

/**
 * Ingest a document: chunk, embed, and store in pgvector.
 */
export async function ingestDocument(
  content: string,
  metadata: DocumentMetadata,
): Promise<{ chunksCreated: number }> {
  const { sourceType, sourceId, ...extraMeta } = metadata;

  logger.info({ sourceType, sourceId }, 'ingestion.start');

  // Remove any existing chunks for this document (re-ingestion)
  await prisma.$executeRaw`
    DELETE FROM "DocumentEmbedding"
    WHERE "sourceType" = ${sourceType} AND "sourceId" = ${sourceId}
  `;

  const chunks = chunkText(content);

  if (chunks.length === 0) {
    logger.warn({ sourceType, sourceId }, 'ingestion.empty_document');
    return { chunksCreated: 0 };
  }

  const embeddings = await generateEmbeddings(chunks);

  // Insert chunks with embeddings using raw SQL for pgvector support
  for (let i = 0; i < chunks.length; i++) {
    const embeddingStr = `[${embeddings[i].join(',')}]`;
    await prisma.$executeRaw`
      INSERT INTO "DocumentEmbedding" (
        "id", "sourceType", "sourceId", "chunkIndex",
        "content", "embedding", "metadata", "createdAt"
      ) VALUES (
        gen_random_uuid(),
        ${sourceType},
        ${sourceId},
        ${i},
        ${chunks[i]},
        ${embeddingStr}::vector,
        ${JSON.stringify({ ...extraMeta, chunkIndex: i, totalChunks: chunks.length })}::jsonb,
        NOW()
      )
    `;
  }

  logger.info({ sourceType, sourceId, chunksCreated: chunks.length }, 'ingestion.complete');

  return { chunksCreated: chunks.length };
}
