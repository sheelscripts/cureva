/**
 * apps/web/src/lib/rag/retriever.ts
 *
 * DEPRECATED — re-export shim only.
 *
 * The canonical RAG retriever lives in the @cureva/rag workspace package
 * (`rag/retriever.ts`). New code should import directly from '@cureva/rag'.
 *
 * Domain-specific RAG wrappers (drug info, drug interactions, symptom
 * pathways, red flags) live in @cureva/mcp and are imported from there.
 *
 * This file existed as a local duplicate that imported from a local
 * `../db/supabase` shim. It was removed because the workspace import is the
 * single source of truth.
 */

export { retrieve, buildContext } from '@cureva/rag';
export type { RetrievedDocument } from '@cureva/rag';
