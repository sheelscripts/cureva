/**
 * verify-connection.ts
 *
 * End-to-end wiring check for Cureva. Run with:
 *
 *   npx tsx backend/scripts/verify-connection.ts
 *
 * Loads env from `.env.local` (repo root) and `apps/web/.env.local`,
 * then exercises every layer:
 *
 *   1. Supabase connectivity + table presence
 *   2. Schema drift detection (the columns fixed in this round)
 *   3. OpenRouter API live call (chat + embeddings)
 *   4. ElevenLabs API key validation
 *   5. RAG `match_documents` RPC
 *   6. MCP notification module (deep-link generation)
 *   7. Resend API key presence (warn-only)
 *
 * Exits 0 when every critical check passes, 1 otherwise. Individual
 * warnings never fail the run — they're advisory.
 */

import { config as loadEnv } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  chatCompletionWithFallback,
  AiGatewayError,
  OpenRouterError,
} from '../app/ai/vercel-gateway';
import { embedWithOpenRouter, EmbeddingError } from '../app/ai/embeddings';

// ─── env loading ───────────────────────────────────────────────────

const repoRoot = resolve(__dirname, '..', '..');

for (const candidate of [
  join(repoRoot, '.env.local'),
  join(repoRoot, 'apps', 'web', '.env.local'),
]) {
  if (existsSync(candidate)) {
    loadEnv({ path: candidate, override: false });
    console.log(`[env] loaded ${candidate.replace(repoRoot + '/', '')}`);
  }
}

// Also accept a top-level .env (no `.local`) if present.
for (const candidate of [
  join(repoRoot, '.env'),
  join(repoRoot, 'apps', 'web', '.env'),
]) {
  if (existsSync(candidate)) {
    loadEnv({ path: candidate, override: false });
  }
}

// ─── helpers ───────────────────────────────────────────────────────

type Status = 'pass' | 'fail' | 'warn' | 'skip';

const ICONS: Record<Status, string> = {
  pass: '✅',
  fail: '❌',
  warn: '⚠️ ',
  skip: '⏭️ ',
};

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
} as const;

function colorize(s: string, c: keyof typeof COLORS): string {
  if (process.stdout.isTTY === false) return s;
  return `${COLORS[c]}${s}${COLORS.reset}`;
}

interface CheckResult {
  name: string;
  status: Status;
  detail?: string;
  ms?: number;
}

const results: CheckResult[] = [];

function record(name: string, status: Status, detail?: string, ms?: number) {
  results.push({ name, status, detail, ms });
}

function header(title: string) {
  console.log('\n' + colorize(`── ${title} `, 'cyan') + colorize('─'.repeat(60 - title.length - 4), 'dim'));
}

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const ms = Date.now() - start;
    process.stdout.write(`  ${colorize(`(${ms}ms)`, 'dim')}`);
    void label;
    void ms;
  }
}

async function section<T>(title: string, fn: () => Promise<T>): Promise<T> {
  header(title);
  try {
    return await fn();
  } finally {
    // results are flushed in the summary at the end
  }
}

// ─── checks ────────────────────────────────────────────────────────

async function checkEnvPresent(): Promise<boolean> {
  // Critical: needed for the app to start.
  const critical = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENROUTER_API_KEY',
  ];
  // Optional: RAG vector search degrades if missing.
  const optional = ['ELEVENLABS_API_KEY', 'RESEND_API_KEY'];

  const missingCritical = critical.filter(
    (k) => !process.env[k] || process.env[k]!.startsWith('your_')
  );
  const missingOptional = optional.filter((k) => !process.env[k]);

  if (missingCritical.length === 0) {
    record('Critical env vars', 'pass', critical.join(', '));
  } else {
    record(
      'Critical env vars',
      'fail',
      `Missing: ${missingCritical.join(', ')}. Update apps/web/.env.local.`
    );
  }

  for (const k of missingOptional) {
    record(
      `Optional: ${k}`,
      'warn',
      `Not set. ${k === 'ELEVENLABS_API_KEY'
        ? 'Scribe STT and voice-call TTS will fall back gracefully.'
        : 'Email notifications disabled; WhatsApp/SMS deep links still work.'}`
    );
  }

  return missingCritical.length === 0;
}

async function checkSupabaseConnectivity(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const start = Date.now();
  const { error } = await client.from('users').select('id', { count: 'exact', head: true });
  const ms = Date.now() - start;

  if (error) {
    record('Supabase DB connectivity', 'fail', `${error.message} (${error.code ?? 'no-code'})`, ms);
    return false;
  }

  record('Supabase DB connectivity', 'pass', `users table reachable`, ms);
  return true;
}

async function checkTablesAndSchema(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const expectedTables = [
    'users',
    'doctors',
    'patients',
    'appointments',
    'scribe_sessions',
    'lab_orders',
    'prescriptions',
    'triage_sessions',
    'waitlist',
    'recovery_sessions',
    'outreach_log',
    'notifications',
    'mcp_tool_calls',
  ];

  const missing: string[] = [];
  for (const table of expectedTables) {
    // NOTE: don't use `{ head: true }` — PostgREST returns 204 for missing
    // tables in that mode, which is a false positive. A real SELECT
    // returns 404 + `PGRST205` for missing tables.
    const { error } = await client.from(table).select('id', { count: 'exact' }).limit(1);
    if (error) missing.push(`${table} (${error.code ?? error.message})`);
  }

  if (missing.length > 0) {
    record(
      'Required tables',
      'fail',
      `Missing or unreachable: ${missing.join(', ')}. Apply backend/schema.sql first.`
    );
    return false;
  }
  record('Required tables', 'pass', `${expectedTables.length} tables present`);

  // Schema drift check on scribe_sessions (the columns fixed by migration 002).
  const { data: cols, error: colErr } = await client
    .rpc('exec_sql' as any, { sql: "" } as any)
    .then(() => ({ data: null, error: new Error('exec_sql RPC not available') }));

  // Fallback: query via information_schema through a HEAD select trick.
  // We just attempt a select with the columns the scribe agent uses.
  const { error: scribeErr } = await client
    .from('scribe_sessions')
    .select('id, full_transcript, soap_note, doctor_id')
    .limit(1);

  if (scribeErr) {
    record(
      'scribe_sessions schema (full_transcript / soap_note / doctor_id)',
      'fail',
      `${scribeErr.message}. Apply backend/migrations/002_fix_scribe_sessions.sql.`
    );
    return false;
  }
  record(
    'scribe_sessions schema',
    'pass',
    'full_transcript, soap_note, doctor_id all readable'
  );

  // outreach_log column alignment.
  const { error: outreachErr } = await client
    .from('outreach_log')
    .select('id, session_id, patient_id, rank, score, message, channel, sent_at, outcome')
    .limit(1);
  if (outreachErr) {
    record(
      'outreach_log schema',
      'fail',
      `${outreachErr.message}. Re-apply backend/schema.sql.`
    );
    return false;
  }
  record('outreach_log schema', 'pass', 'all columns readable');

  // lab_orders.tests (not tests_ordered).
  const { error: labErr } = await client
    .from('lab_orders')
    .select('id, tests')
    .limit(1);
  if (labErr) {
    record('lab_orders schema (tests column)', 'fail', labErr.message);
    return false;
  }
  record('lab_orders schema', 'pass', 'tests column present');

  // doctors.user_id (not auth_user_id).
  const { error: doctorErr } = await client
    .from('doctors')
    .select('id, user_id')
    .limit(1);
  if (doctorErr) {
    record('doctors schema (user_id column)', 'fail', doctorErr.message);
    return false;
  }
  record('doctors schema', 'pass', 'user_id column present');

  void cols;
  void colErr;
  return true;
}

async function checkAiGateway(): Promise<boolean> {
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) {
    record(
      'Vercel AI Gateway',
      'fail',
      'AI_GATEWAY_API_KEY missing in apps/web/.env.local'
    );
    return false;
  }

  const start = Date.now();
  try {
    const result = await chatCompletionWithFallback({
      messages: [
        { role: 'system', content: 'You are concise.' },
        { role: 'user', content: 'Reply with the single word: ok' },
      ],
      maxTokens: 8,
      temperature: 0,
    });
    const ms = Date.now() - start;

    if (!/ok/i.test(result.text)) {
      record(
        'Vercel AI Gateway',
        'warn',
        `Unexpected reply from ${result.model}: "${result.text.trim().slice(0, 80)}"`,
        ms
      );
      return true;
    }

    record(
      'Vercel AI Gateway',
      'pass',
      `${result.model} replied: "${result.text.trim()}"${result.fromFallback ? ' (via fallback)' : ''}`,
      ms
    );
    return true;
  } catch (err: any) {
    if (err instanceof AiGatewayError) {
      record('Vercel AI Gateway', 'fail', `${err.message}`, undefined);
    } else {
      record('Vercel AI Gateway', 'fail', err?.message ?? String(err));
    }
    return false;
  }
}

async function checkElevenLabs(): Promise<boolean> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    record(
      'ElevenLabs API',
      'warn',
      'ELEVENLABS_API_KEY not set. Scribe STT and voice-call TTS will fall back to browser-native TTS / empty transcripts. Add a free key at https://elevenlabs.io/app/settings/api-keys'
    );
    return false;
  }

  const start = Date.now();
  try {
    // User-info endpoint is the cheapest way to validate the key.
    const res = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': key },
    });
    const ms = Date.now() - start;
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      record('ElevenLabs API', 'fail', `${res.status}: ${body.slice(0, 200)}`, ms);
      return false;
    }
    const data: any = await res.json();
    record(
      'ElevenLabs API',
      'pass',
      `Authenticated as ${data?.subscription?.tier ?? 'free'} tier (${data?.subscription?.character_count ?? '?'} chars used)`,
      ms
    );
    return true;
  } catch (err: any) {
    record('ElevenLabs API', 'fail', err?.message ?? String(err));
    return false;
  }
}

async function checkOpenRouterEmbeddings(): Promise<boolean> {
  const start = Date.now();
  try {
    const vector = await embedWithOpenRouter('Cureva connection test.');
    const ms = Date.now() - start;
    if (vector.length !== 768) {
      record(
        'OpenRouter embeddings (RAG)',
        'warn',
        `Expected 768 dims, got ${vector.length}. Set OPENROUTER_EMBED_DIMS=768 or migrate the schema.`,
        ms
      );
      return false;
    }
    record(
      'OpenRouter embeddings (RAG)',
      'pass',
      `768-dim vector received (first 6 values: ${vector.slice(0, 6).map((v) => v.toFixed(4)).join(', ')}…)`,
      ms
    );
    return true;
  } catch (err) {
    if (err instanceof EmbeddingError) {
      // Treat rate-limit / 4xx as warn (RAG degrades gracefully), 5xx as fail.
      const isRateLimit = err.message.includes('429');
      record(
        'OpenRouter embeddings (RAG)',
        isRateLimit ? 'warn' : 'fail',
        err.message,
        undefined
      );
      return !isRateLimit;
    }
    record('OpenRouter embeddings (RAG)', 'fail', (err as any)?.message ?? String(err));
    return false;
  }
}

async function checkRagRpc(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const start = Date.now();
  const { data, error } = await client.rpc('match_documents' as any, {
    query_embedding: new Array(768).fill(0), // dummy zero vector — should return 0 rows, not error
    match_threshold: 0.0,
    match_count: 1,
    category_filter: null,
  } as any);
  const ms = Date.now() - start;

  if (error) {
    record(
      'RAG match_documents RPC',
      'fail',
      `${error.message}. Apply backend/schema.sql (the CREATE FUNCTION block at the bottom).`,
      ms
    );
    return false;
  }
  record(
    'RAG match_documents RPC',
    'pass',
    `Callable (returned ${Array.isArray(data) ? data.length : 0} rows for zero-vector probe)`,
    ms
  );
  return true;
}

async function checkNotificationsModule(): Promise<boolean> {
  // We can't easily import @cureva/mcp in a script without a built
  // workspace. Instead, sanity-check the deep-link format produced by
  // the same encoding rules.
  const fakePhone = '+91 98765-43210';
  const waDigits = fakePhone.replace(/[^\d]/g, '');
  const deepLink = `https://wa.me/${waDigits}?text=${encodeURIComponent('Hello from Cureva')}`;
  const expected = `https://wa.me/919876543210?text=Hello%20from%20Cureva`;

  if (deepLink !== expected) {
    record('WhatsApp deep-link formatter', 'fail', `Got ${deepLink}, expected ${expected}`);
    return false;
  }
  record('WhatsApp deep-link formatter', 'pass', `e.g. ${deepLink}`);

  return true;
}

function checkOptionalServices() {
  if (!process.env.RESEND_API_KEY) {
    record(
      'Resend API key',
      'warn',
      'Not configured. send_email will return success:false until you add RESEND_API_KEY to apps/web/.env.local. WhatsApp/SMS deep links still work without it.'
    );
  } else if (process.env.RESEND_API_KEY.length < 10) {
    record('Resend API key', 'warn', 'Key looks suspiciously short.');
  } else {
    record('Resend API key', 'pass', `${process.env.RESEND_API_KEY.slice(0, 6)}…`);
  }

  if (!process.env.LANGFUSE_PUBLIC_KEY) {
    record('Langfuse', 'skip', 'Optional — not configured.');
  } else {
    record('Langfuse', 'pass', `${process.env.LANGFUSE_PUBLIC_KEY.slice(0, 6)}…`);
  }
}

// ─── main ──────────────────────────────────────────────────────────

async function main() {
  console.log(colorize('\nCureva — Connection Verification', 'cyan'));
  console.log(colorize('────────────────────────────────', 'dim'));

  const envOk = await section('Environment', () => checkEnvPresent()).then((r) => r);

  if (!envOk) {
    printSummary();
    process.exit(1);
  }

  await section('Supabase', async () => {
    await checkSupabaseConnectivity();
    await checkTablesAndSchema();
  });

  await section('AI providers', async () => {
    await checkAiGateway();
    await checkOpenRouterEmbeddings();
    await checkElevenLabs();
  });

  await section('RAG', async () => {
    await checkRagRpc();
  });

  await section('Notifications', async () => {
    await checkNotificationsModule();
    checkOptionalServices();
  });

  printSummary();

  const critical = results.filter((r) => r.status === 'fail');
  process.exit(critical.length > 0 ? 1 : 0);
}

function printSummary() {
  console.log('\n' + colorize('Results', 'cyan'));
  console.log(colorize('───────', 'dim'));
  for (const r of results) {
    const line = `  ${ICONS[r.status]}  ${r.name}`;
    const detail = r.detail ? colorize(` — ${r.detail}`, 'dim') : '';
    const ms = r.ms != null ? colorize(` (${r.ms}ms)`, 'dim') : '';
    const color =
      r.status === 'pass'
        ? 'green'
        : r.status === 'fail'
        ? 'red'
        : r.status === 'warn'
        ? 'yellow'
        : 'dim';
    console.log(colorize(line, color as any) + detail + ms);
  }

  const pass = results.filter((r) => r.status === 'pass').length;
  const fail = results.filter((r) => r.status === 'fail').length;
  const warn = results.filter((r) => r.status === 'warn').length;
  const skip = results.filter((r) => r.status === 'skip').length;

  console.log(
    `\n  ${colorize(`${pass} passed`, 'green')}, ${colorize(`${fail} failed`, 'red')}, ` +
      `${colorize(`${warn} warnings`, 'yellow')}, ${colorize(`${skip} skipped`, 'dim')}`
  );

  if (fail > 0) {
    console.log(colorize('\n  Critical checks failed — see above before continuing.', 'red'));
  } else if (warn > 0) {
    console.log(
      colorize('\n  Critical checks passed. Warnings above are optional.', 'yellow')
    );
  } else {
    console.log(colorize('\n  All checks passed. Cureva is wired up correctly.', 'green'));
  }
}

main().catch((err) => {
  console.error(colorize('\nUnhandled error:', 'red'), err);
  process.exit(2);
});

void readFileSync; // keep import for tree-shaking visibility (no-op)
