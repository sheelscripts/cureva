import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
const repoRoot = resolve(__dirname, '..', '..');
for (const p of [join(repoRoot, '.env.local'), join(repoRoot, 'apps', 'web', '.env.local')]) {
  if (existsSync(p)) loadEnv({ path: p });
}

import { supabaseAdmin, embedWithOpenRouter } from '../app';

(async () => {
  const { data: docs } = await supabaseAdmin.from('documents').select('id, text, source, category').limit(10);
  console.log('=== Docs table count ===', docs?.length ?? 0);
  docs?.forEach((d, i) => console.log(i, JSON.stringify({category: d.category, source: d.source, textHead: d.text?.slice(0, 80)})));

  const qVec = await embedWithOpenRouter('HbA1c blood sugar test');
  console.log('Embedding length:', qVec?.length);
  const { data: rag } = await supabaseAdmin.rpc('match_documents', { query_embedding: qVec, match_threshold: 0.3, match_count: 5 });
  console.log('=== RAG results ===', rag?.length ?? 0);
  rag?.forEach(r => console.log(' -', r.text?.slice(0, 100), 'sim:', r.similarity?.toFixed(3)));
})().catch(e => console.error('ERR:', e.message));
