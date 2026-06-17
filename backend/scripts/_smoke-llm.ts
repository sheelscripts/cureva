// Smoke test for the OpenRouter client. Run with:
//   npx tsx backend/scripts/_smoke-llm.ts
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chatCompletionWithFallback, chatCompletionJson } from '../app/ai/vercel-gateway';

const repoRoot = resolve(__dirname, '..', '..');
for (const p of [join(repoRoot, '.env.local'), join(repoRoot, 'apps', 'web', '.env.local')]) {
  if (existsSync(p)) loadEnv({ path: p });
}

async function main() {
  console.log('[1/2] Plain chat completion…');
  const r = await chatCompletionWithFallback({
    messages: [
      { role: 'system', content: 'You are a friendly assistant. Be very concise.' },
      { role: 'user', content: 'Reply with exactly one sentence: what model are you and which company built you?' },
    ],
    maxTokens: 80,
    model: 'openai/gpt-oss-120b:free', // override for smoke test — Hermes/Llama 405B/70B currently rate-limited upstream
  });
  console.log('   model:', r.model);
  console.log('   fromFallback:', r.fromFallback);
  console.log('   text:', r.text.trim());

  console.log('\n[2/2] Structured output (JSON schema)…');
  const s = await chatCompletionJson<{ greeting: string; mood: string }>({
    messages: [
      { role: 'system', content: 'You greet users warmly.' },
      { role: 'user', content: 'Greet a developer named Alex.' },
    ],
    responseSchema: {
      type: 'OBJECT',
      properties: {
        greeting: { type: 'STRING' },
        mood: { type: 'STRING' },
      },
      required: ['greeting', 'mood'],
    },
    schemaName: 'greeting',
    model: 'openai/gpt-oss-120b:free', // override — see step [1/2]
  });
  console.log('   data:', JSON.stringify(s.data));
  console.log('   model:', s.result?.model, 'fromFallback:', s.result?.fromFallback);
}

main().catch((err) => {
  console.error('FAILED:', err?.message || err);
  process.exit(1);
});
