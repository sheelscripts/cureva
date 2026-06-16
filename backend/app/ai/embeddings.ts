/**
 * Embeddings adapter.
 *
 * The RAG retriever (`rag/retriever.ts`) calls `ai.models.embedContent`
 * which used to hit Google Gemini's text-embedding-004 (768 dims).
 *
 * OpenRouter doesn't expose a free embeddings endpoint, so embeddings
 * stay on Gemini. This module exists as a thin adapter so the embed
 * call can be swapped to a different provider (Hugging Face Inference
 * API, local model, etc.) without changing call sites.
 *
 * If GEMINI_API_KEY is missing or credits are exhausted, `embedWithGemini`
 * throws — callers are expected to wrap calls in try/catch (RAG already does).
 */

const GEMINI_EMBED_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';

const DEFAULT_MODEL = 'text-embedding-004';

export class EmbeddingError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

/**
 * Embed a single string. Returns a 768-dim float array (text-embedding-004).
 */
export async function embedWithGemini(text: string, model: string = DEFAULT_MODEL): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new EmbeddingError(
      'GEMINI_API_KEY not configured. RAG embeddings unavailable; the retriever will return empty results.'
    );
  }

  if (!text || !text.trim()) {
    throw new EmbeddingError('Cannot embed empty text.');
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_QUERY',
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new EmbeddingError(
        `Gemini embeddings ${res.status}: ${body.slice(0, 400) || res.statusText}`,
        res.status
      );
    }

    const data = (await res.json()) as { embedding?: { values?: number[] } };
    const values = data?.embedding?.values;
    if (!values || values.length === 0) {
      throw new EmbeddingError('Gemini embeddings returned an empty vector.');
    }
    return values;
  } catch (err: any) {
    if (err instanceof EmbeddingError) throw err;
    throw new EmbeddingError(`Network error calling Gemini embeddings: ${err?.message || String(err)}`);
  }
}

// Reference unused import to keep the URL constant exported for callers
// that want to swap the underlying transport without losing the
// canonical endpoint string.
void GEMINI_EMBED_URL;
