import { logger } from '@/lib/observability/logger';

const EMBEDDING_API_URL = process.env.EMBEDDING_API_URL ?? 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';
const EMBEDDING_BATCH_SIZE = 64;

interface EmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  usage: { prompt_tokens: number; total_tokens: number };
}

/**
 * Generate an embedding vector for a single text input.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const [result] = await generateEmbeddings([text]);
  return result;
}

/**
 * Generate embedding vectors for multiple text inputs.
 * Handles batching to stay within API limits.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const allEmbeddings: number[][] = new Array(texts.length);

  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);

    const response = await fetchEmbeddings(batch);

    for (const item of response.data) {
      allEmbeddings[i + item.index] = item.embedding;
    }

    logger.info(
      {
        batch_start: i,
        batch_size: batch.length,
        total: texts.length,
        tokens_used: response.usage.total_tokens,
      },
      'embeddings.batch_completed',
    );
  }

  return allEmbeddings;
}

async function fetchEmbeddings(input: string[]): Promise<EmbeddingResponse> {
  const apiKey = process.env.EMBEDDING_API_KEY ?? process.env.OPENAI_API_KEY ?? '';

  const response = await fetch(EMBEDDING_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error({ status: response.status, body }, 'embeddings.api_error');
    throw new Error(`Embedding API returned ${response.status}: ${body}`);
  }

  return (await response.json()) as EmbeddingResponse;
}
