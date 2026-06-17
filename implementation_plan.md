# CureV — Full-Stack Integration Audit & Fix Plan

## Audit Summary

After reading every layer — DB schema, backend, MCP tools, RAG retriever, agent nodes, Next.js API routes, and frontend — here is the precise connection status of each service and every gap found.

---

## ❌ Critical Disconnects Found

### 1. `scribe_sessions` — Schema ≠ Code (CRITICAL)

| What Code Expects | What Schema Has |
|---|---|
| `full_transcript` (TEXT) | `transcript` (TEXT) |
| `soap_note` (JSONB) | ❌ Column does not exist |

**Files affected**: `agents/nodes.ts` (lines 564–581), `backend/app/domains/clinical/clinical.controller.ts`  
**DB schema**: `backend/schema.sql` line 239

The scribe agent will **fail silently** — it writes to columns that don't exist, so SOAP notes are never persisted.

---

### 2. `outreach_logs` vs `outreach_log` — Table Name Mismatch

| Code writes to | Schema defines |
|---|---|
| `outreach_logs` (plural) | `outreach_log` (singular) |

**File**: `agents/nodes.ts` line 362  
Recovery agent's outreach logging will throw a Supabase 404 on every run.

---

### 3. `lab_orders` — Column Name Mismatch

| Code writes to | Schema column |
|---|---|
| `tests_ordered` | `tests` |

**File**: `backend/app/domains/clinical/clinical.controller.ts` line 120  
**DB schema**: `backend/schema.sql` line 214

Lab order creation will throw a Postgres column-not-found error.

---

### 4. `doctors` — Missing `auth_user_id` Column

The `auth.controller.ts` queries `doctors.auth_user_id` but the schema uses `doctors.user_id` (which references `users.id`, not Supabase auth directly).

**File**: `backend/app/domains/auth/auth.controller.ts` lines 28, 37  
**DB schema**: line 81 (`user_id VARCHAR(36) UNIQUE REFERENCES users(id)`)

Auth profile lookup will **always return null**, breaking the doctor session.

---

### 5. `@cureva/rag` — Not Wired into MCP Knowledge Tools (CRITICAL)

The `mcp/knowledge/knowledge.ts` correctly imports `from '@cureva/rag'` but the `rag/` package's `package.json` has no `main` or `exports` entry. The `tsconfig.json` path alias `@rag/*` maps to `../../rag/*` — but `@cureva/rag` (npm workspace import) is a **different resolution path** from the path alias `@rag/*`.

**Result**: `@cureva/rag` resolves correctly at runtime via npm workspace symlink, but the `rag/package.json` is missing `"main": "index.ts"` — identical bug exists in `agents/package.json` and `prompts/package.json`.

---

### 6. Notifications — No Real Delivery (SMS/WhatsApp)

`mcp/notification/notification.ts` logs to the `notifications` table but **never calls a real SMS/WhatsApp provider**. The `.env.local.example` lists `RESEND_API_KEY` but Resend is for email, not SMS/WhatsApp. No Twilio or Meta Cloud API integration exists.

**Current behavior**: Messages are written to DB only — patients never actually receive them.

---

### 7. `legacy mcpTools.ts` Still Active in `lib/agents/`

`apps/web/src/lib/agents/mcpTools.ts` still exists and imports from the **old local `lib/rag/retriever.ts`** path (not `@cureva/rag`). The `agents/nodes.ts` correctly uses `@cureva/mcp` — but the old file is a dead-code risk and any future developer could accidentally import from it.

---

### 8. Frontend → Backend API Connection Gaps

Several frontend components likely still use hardcoded fetch paths that don't match the current API route structure. Need to audit the frontend data-fetching hooks.

---

### 9. Vercel AI SDK — Assessment

**Not useful for this project.** Here's why:
- CureV uses **LangGraph** for agent orchestration, which has its own streaming/state management
- The Vercel AI SDK (`ai` package) is designed for simple LLM streaming UIs using `useChat`/`useCompletion` hooks
- It **cannot stream LangGraph multi-node graphs** — it only handles single-turn request/response or basic streaming
- Using both would create conflicting abstractions

**Verdict**: Skip Vercel AI SDK. Stick with LangGraph + direct `fetch` for streaming if needed.

---

## Required API Keys (Please Provide These)

Before we can make the integration production-ready, I need the following keys:

> [!IMPORTANT]
> **Please share the following API keys** so I can wire them into the codebase and `.env.local.example`. Keys will only be used in your local config file.

| Key | Purpose | Where to Get |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (bypasses RLS) | Supabase Dashboard → Project Settings → API |
| `GEMINI_API_KEY` | Gemini AI (agents + RAG + transcription) | Google AI Studio → API Keys |
| `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_PHONE` | Real SMS delivery | twilio.com → Console |
| `META_WHATSAPP_TOKEN` + `META_PHONE_NUMBER_ID` | Real WhatsApp delivery (optional) | Meta for Developers → WhatsApp Business API |

---

## Open Questions

> [!IMPORTANT]
> **Do you want real SMS delivery (Twilio) or keep it as DB-log-only for now?**
> Real delivery requires Twilio or similar. If you don't need it yet, we can stub it properly.

> [!IMPORTANT]
> **Is your Supabase database already seeded?** The `backend/schema.sql` needs to be applied + `backend/scripts/ingest-docs.ts` run to populate the RAG `documents` table. Without this, all RAG queries return empty results.

---

## Proposed Fixes

### Fix 1 — Schema Migration: `scribe_sessions` + column alignment

#### [MODIFY] [schema.sql](file:///Users/sheelendra/Downloads/VS/curev/backend/schema.sql)
Alter `scribe_sessions` to add `full_transcript` and `soap_note` columns.

#### [NEW] [backend/migrations/002_fix_scribe_sessions.sql](file:///Users/sheelendra/Downloads/VS/curev/backend/migrations/002_fix_scribe_sessions.sql)
```sql
ALTER TABLE scribe_sessions ADD COLUMN IF NOT EXISTS full_transcript TEXT DEFAULT '';
ALTER TABLE scribe_sessions ADD COLUMN IF NOT EXISTS soap_note JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scribe_sessions ADD COLUMN IF NOT EXISTS doctor_id VARCHAR(36) REFERENCES doctors(id);
```

---

### Fix 2 — `agents/nodes.ts`: Fix `outreach_logs` → `outreach_log`

#### [MODIFY] [nodes.ts](file:///Users/sheelendra/Downloads/VS/curev/agents/nodes.ts)
Change table name on line 362.

---

### Fix 3 — `clinical.controller.ts`: Fix `tests_ordered` → `tests`

#### [MODIFY] [clinical.controller.ts](file:///Users/sheelendra/Downloads/VS/curev/backend/app/domains/clinical/clinical.controller.ts)
Column name must match schema: `tests` not `tests_ordered` for `lab_orders`.

---

### Fix 4 — `auth.controller.ts`: Fix `auth_user_id` → `user_id`

#### [MODIFY] [auth.controller.ts](file:///Users/sheelendra/Downloads/VS/curev/backend/app/domains/auth/auth.controller.ts)
Query `doctors.user_id` instead of non-existent `auth_user_id`.

---

### Fix 5 — Package `main` entries missing

#### [MODIFY] [rag/package.json](file:///Users/sheelendra/Downloads/VS/curev/rag/package.json)
#### [MODIFY] [agents/package.json](file:///Users/sheelendra/Downloads/VS/curev/agents/package.json)
#### [MODIFY] [prompts/package.json](file:///Users/sheelendra/Downloads/VS/curev/prompts/package.json)
#### [MODIFY] [ml/package.json](file:///Users/sheelendra/Downloads/VS/curev/ml/package.json)
#### [MODIFY] [eval/package.json](file:///Users/sheelendra/Downloads/VS/curev/eval/package.json)
Add `"main": "index.ts"` to all workspace `package.json` files.

---

### Fix 6 — Real Notification Delivery (SMS via Twilio)

#### [MODIFY] [mcp/notification/notification.ts](file:///Users/sheelendra/Downloads/VS/curev/mcp/notification/notification.ts)
Wire Twilio REST API calls (or stub gracefully with env guard).

#### [NEW] [backend/app/utils/twilio.ts](file:///Users/sheelendra/Downloads/VS/curev/backend/app/utils/twilio.ts)
Twilio SMS helper wrapping the REST API (no SDK dependency needed).

---

### Fix 7 — Clean up legacy `mcpTools.ts`

#### [MODIFY] [apps/web/src/lib/agents/mcpTools.ts](file:///Users/sheelendra/Downloads/VS/curev/apps/web/src/lib/agents/mcpTools.ts)
Replace with a re-export shim pointing to `@cureva/mcp` (mirrors what we did for orchestrator).

---

### Fix 8 — Frontend hook audit + Supabase Realtime for notifications

#### [MODIFY] [apps/web/src/lib/db/supabase.ts](file:///Users/sheelendra/Downloads/VS/curev/apps/web/src/lib/db/supabase.ts)
Already a shim — verify all frontend hooks use `@cureva/backend` client.

#### [NEW] [apps/web/src/lib/hooks/useRealtimeNotifications.ts]
Supabase Realtime subscription to `notifications` table for live frontdesk alerts.

---

### Fix 9 — End-to-end wiring verification script

#### [NEW] [backend/scripts/verify-connection.ts](file:///Users/sheelendra/Downloads/VS/curev/backend/scripts/verify-connection.ts)
Script that tests each service layer and reports what's connected:
- Supabase DB connectivity + schema check
- Gemini API call test
- RAG `match_documents` RPC test  
- Agent orchestrator dry-run
- MCP tool call log verification

---

## Verification Plan

### Automated
```bash
# After env keys set:
npx tsx backend/scripts/verify-connection.ts

# Re-run TypeScript check
cd apps/web && npx tsc --noEmit

# Run evaluations
npx tsx eval/scenarios/run-eval.ts
```

### Manual
1. Apply `backend/migrations/002_fix_scribe_sessions.sql` in Supabase SQL editor
2. Run `npx tsx backend/scripts/ingest-docs.ts` to seed RAG documents
3. Start dev server with `npm run dev`
4. Test scribe audio chunk endpoint, verify SOAP note in DB
5. Test triage chat, verify `triage_sessions` row created

