/**
 * Embeddings adapter (OpenRouter).
 *
 * The RAG retriever (`rag/retriever.ts`) calls `ai.models.embedContent`
 * which used to hit Google Gemini's text-embedding-004. We migrated to
 * OpenRouter for everything LLM-related, including embeddings — this
 * keeps the project on a single API key (OPENROUTER_API_KEY) and
 * removes the dependency on Google AI Studio.
 *
 * Default model: openai/text-embedding-3-small via OpenRouter.
 *   • 768-dimensional output (matches the existing match_documents RPC
 *     which uses vector(768)).
 *   • Free tier unavailable — text-embedding-3-small costs ~$0.02 / 1M
 *     tokens on OpenRouter. For a Cureva demo this is well under a cent
 *     per session, but monitor usage at https://openrouter.ai/activity.
 *
 * Override via env:
 *   OPENROUTER_EMBED_MODEL    default: openai/text-embedding-3-small
 *   OPENROUTER_EMBED_DIMS     default: 768
 *
 * Failures throw — callers are expected to wrap calls in try/catch
 * (the RAG retriever already does).
 */

const OPENROUTER_EMBED_URL = 'https://openrouter.ai/api/v1/embeddings';

function pickModel(): string {
  return process.env.OPENROUTER_EMBED_MODEL || 'openai/text-embedding-3-small';
}

function pickDims(): number {
  const raw = process.env.OPENROUTER_EMBED_DIMS;
  const n = raw ? parseInt(raw, 10) : 768;
  return Number.isFinite(n) && n > 0 ? n : 768;
}

export class EmbeddingError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

/**
 * Embed a single string. Returns a numeric array whose length equals
 * the requested dimension (default 768, matching the schema).
 */
export async function embedWithOpenRouter(text: string, model?: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new EmbeddingError(
      'OPENROUTER_API_KEY not configured. RAG embeddings unavailable; the retriever will return empty results.'
    );
  }

  if (!text || !text.trim()) {
    throw new EmbeddingError('Cannot embed empty text.');
  }

  const useModel = model || pickModel();
  const dims = pickDims();

  try {
    const res = await fetch(OPENROUTER_EMBED_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://cureva.health',
        'X-Title': 'Cureva',
      },
      body: JSON.stringify({
        model: useModel,
        input: text,
        dimensions: dims,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new EmbeddingError(
        `OpenRouter embeddings ${res.status}: ${body.slice(0, 400) || res.statusText}`,
        res.status
      );
    }

    const data = (await res.json()) as {
      data?: Array<{ embedding?: number[]; index?: number }>;
      model?: string;
    };

    const vector = data?.data?.[0]?.embedding;
    if (!vector || vector.length === 0) {
      throw new EmbeddingError('OpenRouter embeddings returned an empty vector.');
    }
    if (vector.length !== dims) {
      // Tolerate but warn — providers occasionally round dimensions.
      console.warn(
        `[embeddings] expected ${dims} dims, got ${vector.length} from ${data?.model ?? useModel}`
      );
    }
    return vector;
  } catch (err: any) {
    if (err instanceof EmbeddingError) throw err;
    throw new EmbeddingError(
      `Network error calling OpenRouter embeddings: ${err?.message || String(err)}`
    );
  }
}

/**
 * Batch embed helper. Splits a list of texts and returns vectors in the
 * same order. Batches up to 96 inputs per request (OpenRouter's typical
 * per-call limit for text-embedding-3-small).
 */
export async function embedBatch(texts: string[], model?: string): Promise<number[][]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new EmbeddingError('OPENROUTER_API_KEY not configured.');
  }
  if (texts.length === 0) return [];

  const useModel = model || pickModel();
  const dims = pickDims();
  const BATCH_SIZE = 96;

  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const chunk = texts.slice(i, i + BATCH_SIZE);
    const res = await fetch(OPENROUTER_EMBED_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://cureva.health',
        'X-Title': 'Cureva',
      },
      body: JSON.stringify({ model: useModel, input: chunk, dimensions: dims }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new EmbeddingError(
        `OpenRouter embeddings ${res.status}: ${body.slice(0, 400) || res.statusText}`,
        res.status
      );
    }
    const data = (await res.json()) as {
      data?: Array<{ embedding?: number[]; index?: number }>;
    };
    // OpenRouter returns embeddings in input order; we sort by index
    // defensively in case a provider shuffles them.
    const sorted = (data.data || [])
      .slice()
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    for (const row of sorted) {
      if (!row.embedding) {
        throw new EmbeddingError('OpenRouter batch returned an empty vector for one row.');
      }
      out.push(row.embedding);
    }
  }
  return out;
}

void OPENROUTER_EMBED_URL;
