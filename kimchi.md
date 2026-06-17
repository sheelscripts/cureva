# Cureva — Kimchi Session Handoff

> Comprehensive handoff document for the Kimchi session that audited, fixed,
> extended, and partially wired the Cureva monorepo. Read this top-to-bottom
> if you're picking the project up cold.

---

## TL;DR

| | |
|---|---|
| Repo | `https://github.com/sheelscripts/curev` |
| Working dir | `/Users/sheelendra/Downloads/VS/curev` |
| Branch | `main` |
| Last 4 commits | `577b25a` → `9e3eb1d` → `a292d24` → `d7a7c2a` |
| LLM provider | **Vercel AI Gateway** (`meta/llama-3.2-90b` primary + `meta/llama-3.3-70b` fallback) |
| Voice STT/TTS | **ElevenLabs** (free tier) |
| Embeddings | **OpenRouter** `text-embedding-3-small` (768-dim) |
| Database | **Supabase** project `mxfbfbfzjnnbbwliuhgb.supabase.co` |
| LLM status | ✅ working — falls back from region-restricted `meta/llama-3.2-90b` to `meta/llama-3.3-70b` |
| Frontend ↔ backend | ⚠️ **partial** — see "Frontend wiring status" below |

---

## Commit history

```
577b25a  Fix 9 critical wiring issues across agents, backend, MCP, and frontend
9e3eb1d  Add voice-call agent, OpenRouter LLM, ElevenLabs voice; apply DB schema
a292d24  Replace Gemini entirely with OpenRouter; add ElevenLabs voice-agent library
d7a7c2a  Switch LLM provider from OpenRouter to Vercel AI Gateway
```

Pre-existing commit: `5e42ed5  full frontend setup`.

---

## What was done

### 1. Audit + 9 backend wiring fixes (`577b25a`)

Original audit is in `implementation_plan.md`. The 9 fixes:

1. **`scribe_sessions` schema/code mismatch** — schema had `transcript`, code wrote `full_transcript` + `soap_note`. Fixed by updating `schema.sql` AND creating `backend/migrations/002_fix_scribe_sessions.sql` (additive migration for existing installs).
2. **`outreach_logs` → `outreach_log`** — recovery agent was writing to a non-existent table. Renamed to singular; also aligned columns to actual schema (`rank`, `score`, `message`, `channel`, `sent_at`, `outcome`).
3. **`tests_ordered` → `tests`** — `clinical.controller.ts` had a wrong column name on `lab_orders`.
4. **`auth_user_id` → `user_id`** — `auth.controller.ts` was querying a non-existent column on `doctors`.
5. (Was already done in the codebase) Package `main` fields — all workspace `package.json` files already had `"main": "index.ts"`.
6. **Notifications — free-tier delivery stack** — replaced Twilio/Meta with:
   - WhatsApp → `https://wa.me/<digits>?text=<encoded>` deep link
   - SMS → `sms:<phone>?body=<encoded>` deep link
   - Email → Resend REST API
7. **Legacy `apps/web/src/lib/agents/mcpTools.ts`** — replaced 312-line dead re-implementation with a thin re-export shim from `@cureva/mcp`. Same treatment for `apps/web/src/lib/rag/retriever.ts`. Plus committed the related untracked shims (`orchestrator.ts`, `ai/gemini.ts`, `db/supabase.ts`).
8. **Frontend hooks** — added `useRealtimeNotifications` (Supabase Realtime subscription to `notifications` table, surfaces `payload.deepLink` for the frontdesk to click).
9. **End-to-end verification** — `backend/scripts/verify-connection.ts` runs all the checks.

### 2. DB schema applied + DB grants bug fix (`9e3eb1d`)

- Applied `backend/schema.sql` to the live DB at `db.mxfbfbfzjnnbbwliuhgb.supabase.co`. Live DB was empty — applied all 28 tables, 120 functions, 87 indexes.
- Discovered: schema.sql had no GRANT statements → service_role got 42501 on every SELECT. Added a GRANTS block to the end of `schema.sql` for fresh installs; applied manually to live DB.
- Fixed verify-connection.ts bug: `head: true` was returning 204 for missing tables in PostgREST, giving false positives. Switched to real `select('id').limit(1)`.

### 3. Voice-call agent + provider migration `Gemini → OpenRouter` (`a292d24`)

- **`backend/app/ai/openrouter.ts`** — OpenAI-compatible chat client. Primary `nousresearch/hermes-3-llama-3.1-405b:free`, fallback `meta-llama/llama-3.3-70b-instruct:free`. Includes JSON-schema structured output with retry-then-fallback chain.
- **`backend/app/ai/elevenlabs.ts`** — STT (`/v1/speech-to-text` multipart upload) + TTS (`/v1/text-to-speech/{voice_id}`). `transcribeAndTranslateAudio` does STT then heuristic Hindi/Hinglish detect → LLM translate to English.
- **`backend/app/ai/embeddings.ts`** — switched from Gemini `text-embedding-004` to OpenRouter `openai/text-embedding-3-small` with `dimensions: 768`. `embedBatch` helper for ingestion.
- **`backend/app/ai/gemini.ts`** rewritten as a shim — same exports (`ai`, `generateStructuredOutput`, `transcribeAndTranslateAudio`) so legacy code in `agents/nodes.ts` and `mcp/knowledge/knowledge.ts` is untouched. Includes `normaliseGeminiContentsToMessages` so the `{role, parts: [{text}]}` shape works through OpenRouter (this was a real silent bug — `String(args.contents)` was emitting `[object Object]`).
- **`backend/scripts/ingest-docs.ts`** — switched from `@google/genai` to `embedBatch`.
- **`backend/app/ai/embeddings.ts` + `gemini.ts`** — Gemini is now fully gone from runtime code (only historical mentions remain in doc-comments).
- **`apps/web/src/app/api/voice-call/turn/route.ts`** — single-turn voice endpoint. audio → ElevenLabs STT → OpenRouter LLM → ElevenLabs TTS → audio. After 3 user turns, prompts the LLM to emit a JSON `{specialty, urgency, reasoning}` block which the UI renders as a recommendation card. Graceful fallbacks everywhere (text-only input if mic blocked, browser speechSynthesis if TTS unavailable).
- **`apps/web/src/lib/hooks/useVoiceCall.ts`** — getUserMedia + MediaRecorder + base64 + audio playback + browser-TTS fallback. Caps history, manages all the booleans, parses recommendation JSON.
- **`apps/web/src/components/voice/VoiceCall.tsx`** — drop-in widget. Tailwind only, matches Cureva warm-cream / clinical-teal palette.
- **`prompts/voice/META_PROMPT.md`** — meta-prompt to regenerate per-component voice agents on demand.
- **`prompts/voice/AGENTS.md`** — seven complete, drop-in-ready ElevenLabs Conversational AI configs:
  1. `triage` (Dr. Aria) — symptom → specialty + urgency
  2. `scribe` (Dr. Mira) — doctor dictation → SOAP note
  3. `appointment` (Sana) — book/reschedule/cancel
  4. `prescription` (Rohan) — refill drafts (doctor-approval gated)
  5. `recovery` (Vikram) — frontdesk slot-recovery workflow
  6. `slotsaver` (Arjun, autonomous) — cancel-event recovery planner, JSON-only
  7. `frontdesk` (Neha) — call routing + escalation

### 4. Switch LLM provider `OpenRouter → Vercel AI Gateway` (`d7a7c2a`)

- **Renamed** `backend/app/ai/openrouter.ts` → `vercel-gateway.ts`. Class `OpenRouterError` → `AiGatewayError` (old name kept as deprecated alias for back-compat).
- Default primary: `meta/llama-3.2-90b` (user-requested).
- Default fallback: `meta/llama-3.3-70b`.
- Added **region-block detection** — when the primary returns a 4xx with "unsupported countries" in the body, the client skips the same-model retry and goes straight to the fallback. No wasted requests.
- **Provider split** (key insight):
  - **Chat** → Vercel AI Gateway (`AI_GATEWAY_API_KEY`)
  - **Embeddings** → OpenRouter (`OPENROUTER_API_KEY`) — Vercel rate-limits ALL embedding models on the free tier
- Updated `apps/web/.env.local`, `.env.local.example`, `verify-connection.ts`, `voice-call/turn/route.ts`, `ARCHITECTURE.md`.

---

## What needs to be implemented

### Frontend ↔ backend wiring gaps (the big one)

The frontend has two parallel data layers and only one is actually wired:

1. **Direct mock imports** — `import { currentPatient } from '@/mock/patients'` — used for initial state in pages, never hits backend
2. **SDK with fetch-then-fallback** — `import { sendTriageMessage } from '@/mock/api'` → re-exports from `@cureva/sdk` → tries `fetch('/api/...')` → falls back to mock

Pages were originally written against (1). They only reach for the SDK functions when the user added a click handler (triage send, book button). So **triage chat and booking got wired, but the initial-state data didn't**.

**Currently real (✅):**

| Feature | Path |
|---|---|
| Triage chat | `PatientPortal` → SDK `sendTriageMessage` → `POST /api/triage` → `runOrchestrator` |
| Booking | `PatientPortal` → SDK `bookAppointment` → `POST /api/appointments` |
| SlotSaver dashboard | `SlotSaverContext` → `fetch('/api/slotsaver')` on mount |
| Voice call | `useVoiceCall` → `POST /api/voice-call/turn` |
| Scribe audio | `POST /api/scribe/chunk` → LangGraph scribe node |

**Currently mock-only (❌):**

| Component | Mock file | Endpoint that exists but is unused |
|---|---|---|
| `PatientPortal` (profile/appointments/prescriptions/labs/timeline) | `mock/patients.ts` | `/api/patients`, `/api/appointments`, `/api/prescriptions`, `/api/labs` |
| `DoctorWorkspace` | `mock/doctors.ts` | (no endpoint yet) |
| `AdminDashboard` | `mock/admin.ts` | (no endpoint yet) |
| `DoctorLeaderboard` | `mock/analytics.ts` | (no endpoint yet) |
| `EscalationTable` | `mock/analytics.ts` | (no endpoint yet) |
| `PromptRegistryTable` | `mock/admin.ts` | (no endpoint yet) |

**Three-phase fix (~4-6 hours):**

- **Phase A — quick win (~30 min)**: In `PatientPortal.tsx`, replace `useState(currentPatient)` with `useEffect(() => getPatient().then(setPatient), [])`. Same for appointments, prescriptions, labs, timeline. The SDK functions already exist; just need to wire the initial load.
- **Phase B (~1-2 hr)**: Build the missing API routes:
  - `apps/web/src/app/api/admin/agents/route.ts` — list agent runs + metrics
  - `apps/web/src/app/api/admin/doctors/route.ts` — doctor roster + per-doctor leaderboard
  - `apps/web/src/app/api/admin/escalations/route.ts` — list escalations
  - `apps/web/src/app/api/admin/prompts/route.ts` — list agent prompts + their versions
  - `apps/web/src/app/api/admin/revenue/route.ts` — revenue aggregations
  - `apps/web/src/app/api/agents/route.ts` — list agent definitions
  - `apps/web/src/app/api/analytics/leaderboard/route.ts` — already in mock/analytics.ts
  - `apps/web/src/app/api/analytics/escalations/route.ts` — already in mock/analytics.ts
  - Mirror the slotsaver pattern (`supabaseAdmin.from(...).select(...)`).
- **Phase C (~30 min)**: Update SDK re-exports in `packages/sdk/src/patients.ts` (and friends) to call real APIs by default. Currently they do `export const getPatient = mockApi.getPatient` which always returns mock. Change to: `export const getPatient = () => fetch('/api/patients').then(r => r.json())` with the existing mock as fallback.

### Other TODOs

- **Add `ELEVENLABS_API_KEY`** to `apps/web/.env.local` — currently empty. Without it, scribe STT and voice-call TTS both fail gracefully to browser-native fallbacks.
- **Add `RESEND_API_KEY`** to `apps/web/.env.local` — currently empty. Without it, `send_email` returns `success: false`; WhatsApp/SMS deep links still work.
- **Run RAG ingestion**: `npx tsx backend/scripts/ingest-docs.ts` — embeds the 5 mock clinical guidelines into the `documents` table. Without this, RAG vector search returns empty (keyword fallback still works).
- **Run DB seeding**: `npx tsx backend/scripts/seed.ts` — populates `patients`, `doctors`, `appointments`, `waitlist`, `recovery_sessions`, etc. with demo data. Currently 0 rows in most tables.
- **Remove unused `@google/genai` dep** from `apps/web/package.json` — no code in `apps/web/src/` imports it; the shim in `backend/app/ai/gemini.ts` is what wraps it. Safe to `npm uninstall @google/genai` from `apps/web`.
- **Wire `<VoiceCall />` into a page** — currently no page renders the component. Drop it into e.g. `apps/web/src/app/patient/page.tsx` or a new `/app/patient/call/page.tsx`.
- **Wire `useRealtimeNotifications`** — also currently unused. Drop into the frontdesk dashboard.

---

## Architecture decisions (and why)

| Decision | Why |
|---|---|
| **Vercel AI Gateway for chat** | User explicitly asked. One `vck_` key covers OpenAI, Anthropic, Meta, Mistral, Google, Alibaba. |
| **OpenRouter for embeddings** | Vercel rate-limits ALL embedding models on free tier. OpenRouter `text-embedding-3-small` is $0.02/1M tokens. |
| **`meta/llama-3.2-90b` as primary** | User asked. Falls through to `meta/llama-3.3-70b` (region-restricted via Bedrock from India). |
| **Deep links over Twilio/Meta Cloud** | Free. No approval, no cost. Frontdesk clicks the link, WhatsApp/SMS opens with the message pre-filled. |
| **LangGraph for orchestration** | Already in place; Vercel AI SDK only does single-LLM streaming, can't compose multi-agent graphs. |
| **`response_format: json_schema` with prompt-engineered fallback** | Not all free models support `json_schema`. The fallback adds an explicit "JSON only" system message. |
| **Server-side `gemini.ts` shim kept** | Every existing agent (`generateStructuredOutput`, `transcribeAndTranslateAudio`, `ai.models.generateContent`, `ai.models.embedContent`) routes through it. Zero call-site changes required. |
| **ElevenLabs over OpenAI TTS** | Free tier (10k chars/month). OpenAI TTS is $15/1M chars. |
| **ElevenLabs STT over Gemini audio** | OpenRouter doesn't have a free audio model; ElevenLabs has a free STT tier (~1h/month). |

---

## Environment variables

Live values are in `apps/web/.env.local` (gitignored). All keys below were shared in plaintext during the session — **rotate them**.

```env
# ─── Supabase ────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://mxfbfbfzjnnbbwliuhgb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# ─── Vercel AI Gateway (chat) ─────────────────────────
AI_GATEWAY_API_KEY=vck_...
AI_GATEWAY_PRIMARY_MODEL=meta/llama-3.2-90b
AI_GATEWAY_FALLBACK_MODEL=meta/llama-3.3-70b

# ─── OpenRouter (embeddings only) ────────────────────
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_EMBED_MODEL=openai/text-embedding-3-small
OPENROUTER_EMBED_DIMS=768

# ─── ElevenLabs (voice) ──────────────────────────────
ELEVENLABS_API_KEY=               # ← user to fill in (free tier at elevenlabs.io)

# ─── Resend (email) ──────────────────────────────────
RESEND_API_KEY=                   # ← user to fill in (free tier at resend.com)
RESEND_FROM=

# ─── Observability ───────────────────────────────────
# LANGFUSE_PUBLIC_KEY=
# LANGFUSE_SECRET_KEY=
```

`apps/web/.env.local.example` is committed as a template.

---

## How to run

```bash
# Install
npm install

# Apply schema (only needed once per fresh DB)
psql "$DATABASE_URL" -f backend/schema.sql

# Seed demo data (patients, doctors, waitlist, recovery sessions…)
npx tsx backend/scripts/seed.ts

# Ingest RAG documents (5 clinical guidelines)
npx tsx backend/scripts/ingest-docs.ts

# Verify everything is wired
npx tsx backend/scripts/verify-connection.ts

# Type-check the whole monorepo
npx tsc --noEmit --project tsconfig.check.json

# Run dev server
cd apps/web && npm run dev
```

---

## Key files

```
backend/
├── app/
│   ├── ai/
│   │   ├── vercel-gateway.ts          # LLM client (Vercel AI Gateway)
│   │   ├── elevenlabs.ts              # STT + TTS
│   │   ├── embeddings.ts              # OpenRouter embeddings (text-embedding-3-small, 768d)
│   │   └── gemini.ts                  # Legacy shim — DO NOT add new code here
│   ├── db/supabase.ts                 # supabase + supabaseAdmin
│   ├── domains/
│   │   ├── clinical/clinical.controller.ts
│   │   ├── patients/patients.controller.ts
│   │   ├── slotsaver/slotsaver.controller.ts
│   │   ├── auth/auth.controller.ts
│   │   ├── appointments/...
│   │   └── analytics/...
│   ├── utils/
│   │   ├── resend.ts                  # Resend email helper
│   │   └── response.ts
│   └── index.ts                       # @cureva/backend barrel export
├── migrations/
│   └── 002_fix_scribe_sessions.sql    # Safe to re-apply (idempotent ADD COLUMN IF NOT EXISTS)
├── scripts/
│   ├── verify-connection.ts           # End-to-end smoke test
│   ├── seed.ts                        # Demo data
│   └── ingest-docs.ts                 # RAG ingestion
└── schema.sql                         # Full schema (with grants at the bottom)

agents/
├── orchestrator.ts                    # LangGraph graph topology
├── nodes.ts                           # Node implementations (uses generateStructuredOutput, transcribeAndTranslateAudio)
├── state.ts                           # AgentStateAnnotation
└── index.ts

mcp/
├── notification/notification.ts       # wa.me + sms: deep links + Resend
├── knowledge/knowledge.ts             # RAG tools
└── ...

rag/
├── retriever.ts                       # Vector + keyword + RRF + LLM rerank
└── index.ts

prompts/voice/                         # ⭐ ElevenLabs voice-agent library
├── META_PROMPT.md                     # Regenerate per-component prompts
└── AGENTS.md                          # 7 ready-to-use agent configs

apps/web/src/
├── app/api/                           # 10 Next.js API routes
│   ├── voice-call/turn/route.ts       # audio → STT → LLM → TTS → audio
│   ├── slotsaver/route.ts
│   ├── scribe/chunk/route.ts
│   ├── triage/route.ts
│   ├── prescriptions/{route,pdf/route}.tsx
│   ├── labs/route.ts
│   ├── appointments/route.ts
│   └── patients/route.ts
├── components/voice/VoiceCall.tsx     # Drop-in widget
├── lib/
│   ├── ai/gemini.ts                   # Re-export shim from @cureva/backend
│   ├── agents/{mcpTools,orchestrator}.ts  # Re-export shims from @cureva/{mcp,agents}
│   ├── rag/retriever.ts               # Re-export shim from @cureva/rag
│   ├── db/supabase.ts                 # Re-export shim from @cureva/backend
│   └── hooks/
│       ├── useVoiceCall.ts            # Voice-call state machine
│       └── useRealtimeNotifications.ts # Supabase Realtime → notifications
└── features/                          # ⚠️ Mostly on mock data — see "Frontend wiring" above
    ├── patients/components/PatientPortal.tsx
    ├── slotsaver/SlotSaverContext.tsx
    ├── doctor/DoctorWorkspace.tsx
    ├── admin/AdminDashboard.tsx
    ├── analytics/...
    └── agents/...

packages/
├── sdk/src/
│   ├── patients.ts                    # Re-exports MOCK functions — needs Phase C fix
│   ├── appointments.ts
│   ├── clinical.ts
│   └── slotsaver.ts
└── types/src/                         # Shared types (no notification types yet)

docs/
├── ARCHITECTURE.md                    # Updated for Vercel AI Gateway
├── AGENTS.md                          # Updated to remove Gemini references
├── SETUP.md                           # Updated to use OPENROUTER + AI_GATEWAY
└── ...
```

---

## Known gotchas

1. **`meta/llama-3.2-90b` is region-blocked.** Meta's EULA prevents Bedrock from serving it from India (and possibly other regions). The fallback to `meta/llama-3.3-70b` handles it transparently. If the user wants to actually use 3.2-90b, they need to be in an approved region or pay for a different provider.

2. **All Vercel AI Gateway embedding models are rate-limited on the free tier.** That's why embeddings stayed on OpenRouter. If the user upgrades to paid Vercel credits, they can flip embeddings to Vercel.

3. **Supabase RLS is enabled on every table, but there are no RLS policies.** Service role bypasses RLS, so the backend works. The anon/authenticated roles have no access (they get 42501). The schema's GRANT block gives those roles table-level access, but RLS will still filter rows. Add policies when you start exposing data to non-admin users.

4. **`backend/app/ai/gemini.ts` is intentionally named "gemini.ts".** It's now a thin shim — every function delegates to OpenRouter or ElevenLabs. Rename only if you want to do a full sweep; the shim preserves the call-site contract.

5. **OpenRouter model IDs change.** When I first tested, `nousresearch/hermes-3-405b:free` didn't exist (it's `nousresearch/hermes-3-llama-3.1-405b:free` now). Same may happen with Vercel — check `https://ai-gateway.vercel.sh/v1/models` if a model starts failing.

6. **`apps/web/src/mock/` is dead-code from before the wiring audit.** All 7 mock files import data directly into components. Phase A/B/C above is the path to deleting them.

7. **`useRealtimeNotifications` and `<VoiceCall />` are built but not mounted anywhere.** Drop them into a page when you need them.

---

## Security — rotate these keys

The following were shared in plaintext in the session:

1. Supabase URL + publishable key + secret key
2. OpenRouter API key
3. Supabase DB password (`aeronyx-2003`)
4. Vercel AI Gateway `vck_` key
5. (Old) Gemini API key

All are in conversation history. Rotate:
- **Supabase**: Project Settings → API → Roll both keys
- **OpenRouter**: https://openrouter.ai/settings/keys → delete + reissue
- **Supabase DB password**: Settings → Database → Reset
- **Vercel AI Gateway**: https://vercel.com/dashboard/ai-gateway → rotate

The gitignored `apps/web/.env.local` contains the live values; `.env.local.example` is committed with placeholders only.

---

## Verification command reference

```bash
# Whole monorepo type-check
npx tsc --noEmit --project tsconfig.check.json

# Just the web app
cd apps/web && npx tsc --noEmit

# Live connection / integration test
npx tsx backend/scripts/verify-connection.ts
```

Current verify output: **11 pass, 0 fail, 4 warnings, 1 skipped**.

The warnings are:
- `ELEVENLABS_API_KEY` not set (graceful fallback)
- `RESEND_API_KEY` not set (email disabled, WhatsApp/SMS still work)
- ElevenLabs API not set (same as above)
- Resend key not set (same as above)

The skip is `Langfuse` (observability, not configured).

---

## Quick "where do I start" for the next session

1. Add `ELEVENLABS_API_KEY` and `RESEND_API_KEY` to `apps/web/.env.local` so scribe STT, voice-call TTS, and email notifications are real.
2. Run `npx tsx backend/scripts/seed.ts` and `npx tsx backend/scripts/ingest-docs.ts` to get demo data + RAG vectors into the DB.
3. **Phase A**: 30 minutes of work in `PatientPortal.tsx` to wire initial-state data fetching. Big visual win.
4. **Phase B**: Build the missing admin/analytics/doctor endpoints. Use `apps/web/src/mock/admin.ts` and `mock/analytics.ts` as the shape reference.
5. **Phase C**: Update `packages/sdk/src/patients.ts` (etc.) to point at the real APIs, not the mocks.
6. Mount `<VoiceCall />` and `useRealtimeNotifications` somewhere visible.
7. (Optional) Drop the unused `@google/genai` dep from `apps/web/package.json`.

After Phases A-C, the frontend is fully reactive to the backend. Until then, triage + booking + slotsaver + voice call + scribe work; everything else is mock.
