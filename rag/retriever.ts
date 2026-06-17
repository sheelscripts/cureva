import { supabaseAdmin } from '@backend/app/db/supabase';
import { ai } from '@backend/app/ai/gemini';

export interface RetrievedDocument {
  id: string;
  text: string;
  source: string;
  category: string;
  score: number;
  method: 'vector' | 'keyword' | 'rrf';
}

/**
 * Retrieve document chunks using vector cosine similarity
 */
async function vectorSearch(
  query: string,
  categoryFilter?: string,
  limit = 20
): Promise<RetrievedDocument[]> {
  try {
    const embedResponse = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: query,
    });

    const vector = embedResponse.embeddings?.[0]?.values || (embedResponse as any).embedding?.values;
    if (!vector) return [];

    const { data, error } = await supabaseAdmin.rpc('match_documents', {
      query_embedding: vector,
      match_threshold: 0.3,
      match_count: limit,
      category_filter: categoryFilter || null,
    });

    if (error) {
      console.error('[vectorSearch] RPC Error:', error);
      return [];
    }

    return (data || []).map((doc: any) => ({
      id: doc.id,
      text: doc.text,
      source: doc.source,
      category: doc.category,
      score: doc.similarity,
      method: 'vector',
    }));
  } catch (e) {
    console.error('[vectorSearch] Failed:', e);
    return [];
  }
}

/**
 * Retrieve document chunks using keyword search (PostgreSQL ILIKE or full-text)
 */
async function keywordSearch(
  query: string,
  categoryFilter?: string,
  limit = 20
): Promise<RetrievedDocument[]> {
  try {
    let q = supabaseAdmin
      .from('documents')
      .select('id, text, source, category');

    if (categoryFilter) {
      q = q.eq('category', categoryFilter);
    }

    // Split query words and build OR conditions
    const words = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    if (words.length === 0) return [];

    // Simple word-based ranking
    const { data, error } = await q.limit(100);
    if (error || !data) return [];

    const scored = data.map((doc) => {
      let matches = 0;
      const docText = doc.text.toLowerCase();
      words.forEach((w) => {
        if (docText.includes(w)) matches++;
      });
      return {
        id: doc.id,
        text: doc.text,
        source: doc.source,
        category: doc.category,
        score: matches / words.length,
        method: 'keyword' as const,
      };
    });

    return scored
      .filter((doc) => doc.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (e) {
    console.error('[keywordSearch] Failed:', e);
    return [];
  }
}

/**
 * Reciprocal Rank Fusion (RRF)
 * RRF Score = Sum_over_runs (1 / (k + rank))
 */
function reciprocalRankFusion(
  vectorResults: RetrievedDocument[],
  keywordResults: RetrievedDocument[],
  k = 60,
  limit = 10
): RetrievedDocument[] {
  const scores: Record<string, number> = {};
  const docMap: Record<string, RetrievedDocument> = {};

  // Rank starts at 1
  vectorResults.forEach((doc, idx) => {
    scores[doc.id] = (scores[doc.id] || 0) + 1 / (k + idx + 1);
    docMap[doc.id] = doc;
  });

  keywordResults.forEach((doc, idx) => {
    scores[doc.id] = (scores[doc.id] || 0) + 1 / (k + idx + 1);
    docMap[doc.id] = doc;
  });

  const sortedIds = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);

  return sortedIds.slice(0, limit).map((id) => ({
    ...docMap[id],
    score: scores[id],
    method: 'rrf',
  }));
}

/**
 * Rerank documents using the configured LLM (OpenRouter primary, free
 * fallback) for final context grounding. Goes through the
 * backend/app/ai/gemini.ts shim so any OpenRouter change is transparent.
 */
async function rerank(query: string, candidates: RetrievedDocument[], limit = 3): Promise<RetrievedDocument[]> {
  if (candidates.length <= 1) return candidates.slice(0, limit);

  try {
    const response = await ai.models.generateContent({
      // Model selection is handled inside the `ai` shim (OpenRouter primary
      // + fallback). Passing a model name here is preserved for logging
      // only — the actual call routes through OpenRouter.
      model: 'openrouter-primary',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Query: "${query}"

Rank the following document chunks by clinical relevance to the query.
Respond with a JSON array of indices representing the ranked documents, from most relevant to least relevant.
Format: [index1, index2, ...] where indices correspond to the candidate list order.

Candidates:
${candidates.map((c, i) => `[${i}]: Source: ${c.source}\nContent: ${c.text}`).join('\n\n')}`
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
      }
    });

    const outputText = response.text || '[]';
    const rankedIndices: number[] = JSON.parse(outputText);
    
    const reranked: RetrievedDocument[] = [];
    rankedIndices.forEach((idx, order) => {
      if (candidates[idx]) {
        reranked.push({
          ...candidates[idx],
          // Boosted rerank score based on LLM order
          score: 1.0 - (order * 0.1),
        });
      }
    });

    // Append any omitted candidates at the end
    candidates.forEach((cand, idx) => {
      if (!rankedIndices.includes(idx)) {
        reranked.push({ ...cand, score: cand.score * 0.5 });
      }
    });

    return reranked.slice(0, limit);
  } catch (e) {
    console.warn('[rerank] Failed, returning candidates:', e);
    return candidates.slice(0, limit);
  }
}

/**
 * Main retrieval function: Vector + Keyword + RRF + Reranker
 */
export async function retrieve(
  query: string,
  categoryFilter?: string,
  limit = 3
): Promise<RetrievedDocument[]> {
  const [vecDocs, keyDocs] = await Promise.all([
    vectorSearch(query, categoryFilter, 15),
    keywordSearch(query, categoryFilter, 15),
  ]);

  const merged = reciprocalRankFusion(vecDocs, keyDocs, 60, 10);
  return rerank(query, merged, limit);
}

/**
 * Format retrieved documents into formatted clinical context prompt block
 */
export function buildContext(results: RetrievedDocument[]): string {
  if (results.length === 0) return '';
  return results
    .map((doc) => `[Source: ${doc.source.replace('.pdf', '')}] \n${doc.text}`)
    .join('\n\n---\n\n');
}
