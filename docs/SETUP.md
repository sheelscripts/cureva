# CureV — Developer Setup Guide

## Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project
- An OpenRouter API key (covers chat + embeddings)

---

## 1. Clone & Install

```bash
git clone <repo>
cd curev
npm install
```

---

## 2. Environment Variables

Copy the example and fill in your keys:

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENROUTER_API_KEY=sk-or-v1-...
```

---

## 3. Database Setup

Apply migrations in order:

```bash
# Using Supabase CLI
supabase db push

# Or apply manually in Supabase SQL editor
cat backend/schema.sql | # copy into SQL editor
```

---

## 4. Run Development Server

```bash
npm run dev
```

Opens at `http://localhost:3000`

---

## 5. Run ML Calibration

Validates the no-show risk model tier distributions:

```bash
npx tsx ml/scripts/train.ts
```

---

## 6. Run Agent Evaluations

Runs clinical agent end-to-end tests (requires OPENROUTER_API_KEY):

```bash
npx tsx eval/scenarios/run-eval.ts
```

Generates `eval/scenarios/report.md` with pass/fail results.

---

## 7. TypeScript Type Check

```bash
cd apps/web
npx tsc --noEmit
```

---

## Workspace Package Overview

| Package | Import Alias | Description |
|---|---|---|
| `@cureva/backend` | `@backend/*` | Supabase clients, AI helpers, domain controllers |
| `@cureva/agents` | `@agents/*` | LangGraph state, nodes, orchestrator |
| `@cureva/mcp` | `@mcp/*` | MCP tool wrappers |
| `@cureva/rag` | `@rag/*` | Clinical knowledge retriever |
| `@cureva/prompts` | `@prompts/*` | Agent prompt templates |
| `@cureva/ml` | `@ml/*` | No-show risk prediction model |
| `@cureva/eval` | `@eval/*` | Evaluation scenarios and runner |

---

## Cron Jobs

| Endpoint | Schedule | Purpose |
|---|---|---|
| `/api/slotsaver/cron` | Daily 6:00 AM | Run risk prediction for tomorrow's appointments |

Configure in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/slotsaver/cron", "schedule": "0 6 * * *" }
  ]
}
```
