# Cureva — Mock Data Wiring Reference

> Generated after Phase A/B/C implementation. This document explains how
> the mock data layer is connected to the real backend, so you can flip
> between mock and real with minimal effort.

## TL;DR

Three parallel layers exist:

```
┌─────────────────────────────────────────────────────────────────┐
│  React Component (apps/web/src/features/.../*.tsx)              │
│  ── useState(mockInitialValue) + useEffect(SDK fn)              │
└──────────────────┬──────────────────────────────────────────────┘
                   │ imports from
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  @cureva/sdk  (packages/sdk/src/{patients,admin,analytics,...}) │
│  ── Async function: fetch('/api/...') → fall back to mock       │
└──────────────────┬──────────────────────────────────────────────┘
                   │ server-side fetch
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Next.js API Route  (apps/web/src/app/api/.../route.ts)         │
│  ── Query Supabase via supabaseAdmin → fall back to mock shape  │
└──────────────────┬──────────────────────────────────────────────┘
                   │ real DB
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase  (mxfbfbfzjnnbbwliuhgb.supabase.co)                  │
│  ── Tables from backend/schema.sql                              │
└─────────────────────────────────────────────────────────────────┘
```

**Every layer has a mock fallback.** Components never break — they always render.

---

## Layer 1: Mock Data Sources (the "what is mock")

| Mock file | What's inside | Used as fallback by |
|---|---|---|
| `packages/sdk/src/mock/patients.ts` | Priya Mehta profile, 10 appointments, 4 prescriptions, 4 lab reports, 9 timeline events | `getPatient`, `getAppointments`, `getPrescriptions`, `getLabReports`, `getHealthTimeline` |
| `packages/sdk/src/mock/api.ts` | `sendTriageMessage` mock response generator + fetch wrappers | `bookAppointment`, `sendTriageMessage`, etc. |
| `packages/sdk/src/mock/analytics.ts` | 30-day revenue, doctor metrics, agent metrics, prompts, escalations | All admin/analytics API routes |
| `packages/sdk/src/mock/doctors.ts` | Doctor queue, 12 patient profiles, drug database | DoctorWorkspace (static — no API yet) |
| `packages/sdk/src/mock/slotsaver.ts` | SlotSaver dashboard mock | `/api/slotsaver` route (via backend domain controller) |
| `apps/web/src/mock/{patients,doctors,admin,analytics,api,slotsaver,...}.ts` | **Re-export shims** that point to `@cureva/sdk` | Components via `@/mock/*` paths |

**These files were NOT deleted.** They stay as the single source of truth for demo data.

---

## Layer 2: SDK Functions (the "fetch first, fall back")

`packages/sdk/src/{patients,appointments,clinical,admin,analytics,doctors}.ts`

Each file follows the same pattern:

```typescript
import * as mockXyz from "./mock/xyz";

const getApiUrl = (path: string): string => {
  if (typeof window !== "undefined") return path; // browser → relative
  const host = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  return `${host}${path}`;
};

export const getXyz = async () => {
  try {
    const res = await fetch(getApiUrl("/api/xyz"));
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("getXyz fetch failed, using mock:", e);
  }
  return mockXyz.xyz;
};
```

**To force mock mode** (e.g. offline demo, broken backend): just override the fetch in the browser DevTools network tab, OR delete the route file under `apps/web/src/app/api/`. The SDK will silently fall back.

**To force real mode**: seed the Supabase tables (run `npx tsx backend/scripts/seed.ts`). The routes will return DB rows; if the table is empty they fall back to mock shape.

---

## Layer 3: API Routes (the "real first, fall back to mock shape")

`apps/web/src/app/api/.../route.ts`

Each route follows this pattern:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@cureva/backend';
import { xyzMock } from '@/mock/xyz';

export async function GET(_req: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('xyz_table')
      .select('*')
      .limit(100);

    if (error || !data || data.length === 0) {
      return NextResponse.json(xyzMock); // ← mock fallback
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

**To force mock from a route**: wrap the Supabase call in `if (false)` or return early:
```typescript
export async function GET() {
  return NextResponse.json(xyzMock);
}
```

**To force real**: make sure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local` AND the table has rows.

---

## Layer 4: Components (the "useEffect to refresh")

Pattern in every wired component:

```typescript
import { xyzMock } from "@/mock/xyz";
import { getXyz } from "@cureva/sdk";

const [data, setData] = useState(xyzMock); // initial = mock (no flicker)

useEffect(() => {
  getXyz().then(setData).catch(() => {});
}, []);
```

**To force mock**: comment out the `useEffect` body.

---

## What's Wired vs. What Isn't

### ✅ Wired (fetches on mount, falls back to mock)
| Component | Data fetched via |
|---|---|
| `PatientPortal` | `getPatient`, `getAppointments`, `getPrescriptions`, `getLabReports`, `getHealthTimeline` |
| `AdminDashboard` | `getRevenueMetrics`, `getSlotSaverMetricsAdmin`, `getDoctorMetrics`, `getAgentMetrics` |
| `DoctorLeaderboard` | `getDoctorMetrics` |
| `EscalationTable` | `getEscalations` |
| `PromptRegistryTable` | `getPromptMetrics` |
| `SlotSaverContext` | `fetch('/api/slotsaver')` on mount |
| Triage chat (PatientPortal) | `sendTriageMessage` on click |
| Booking flow (PatientPortal) | `bookAppointment` on click |

### ⚠️ Still static (only mock — no API yet)
| Component | Why |
|---|---|
| `DoctorWorkspace` | Doctor queue + patient profiles are session-scoped; would need auth context first |
| `AgentHealthTable`, `MCPToolTable`, `AgentOperationsBar` | Mostly rendered from AgentHealthTable which gets data from AdminDashboard's `agentMetrics` |
| Inline `RevenueChart`, `UtilizationChart`, etc. | Receive props from parent that IS wired |

---

## How to Add a New Mock Data Source

1. Add the data shape to `packages/sdk/src/mock/<file>.ts`
2. Re-export from `packages/sdk/src/mock/<file>.ts` and `packages/sdk/src/index.ts`
3. If the component needs async: add `get<Name>` to `packages/sdk/src/<file>.ts` (follow the fetch-fallback pattern)
4. If there's no API route yet: create one at `apps/web/src/app/api/<path>/route.ts`
5. In the component: import both the mock (for initial state) and the SDK function (for fetch)

---

## How to "Unwire" (force everything back to static mock)

In each wired component, comment out the `useEffect` that calls the SDK function. The `useState(mockData)` initial value becomes the only data source.

For the SDK layer: replace each `fetch(...)` block with `return mockXyz.xyz;`.

For the API routes: return `NextResponse.json(mockXyz)` directly.

---

## Run Commands

```bash
# Type-check the whole monorepo (already passes)
npx tsc --noEmit --project tsconfig.check.json

# End-to-end connectivity test
npx tsx backend/scripts/verify-connection.ts

# Seed DB with demo data (so real APIs return real rows)
npx tsx backend/scripts/seed.ts

# Ingest RAG documents (so vector search works)
npx tsx backend/scripts/ingest-docs.ts

# Run dev server
cd apps/web && npm run dev
```

---

## File Map (after Phases A/B/C)

```
NEW SDK files:
  packages/sdk/src/admin.ts          (86 lines — getRevenueMetrics, getDoctorMetrics, getAgentMetrics, getPromptMetrics)
  packages/sdk/src/analytics.ts      (9 lines — getEscalations, getSlotSaverMetricsAdmin)
  packages/sdk/src/doctors.ts        (38 lines — re-exports + getTodayQueue stub)

NEW API routes (8 files, 588 lines total):
  apps/web/src/app/api/admin/agents/route.ts       (106 lines)
  apps/web/src/app/api/admin/doctors/route.ts      (57 lines)
  apps/web/src/app/api/admin/escalations/route.ts  (78 lines)
  apps/web/src/app/api/admin/prompts/route.ts      (43 lines)
  apps/web/src/app/api/admin/revenue/route.ts      (108 lines)
  apps/web/src/app/api/agents/route.ts             (61 lines)
  apps/web/src/app/api/analytics/escalations/route.ts (77 lines)
  apps/web/src/app/api/analytics/leaderboard/route.ts  (58 lines)

MODIFIED components (added useState + useEffect):
  apps/web/src/features/patients/components/PatientPortal.tsx       (Phase A)
  apps/web/src/features/admin/AdminDashboard.tsx                   (Phase C)
  apps/web/src/features/analytics/components/DoctorLeaderboard.tsx (Phase C)
  apps/web/src/features/analytics/components/EscalationTable.tsx   (Phase C)
  apps/web/src/features/agents/components/PromptRegistryTable.tsx  (Phase C)

MODIFIED SDK barrel:
  packages/sdk/src/index.ts        (added exports for admin/analytics/doctors)
```

---

## Verification Results

```
✅ TypeScript:  No errors found (whole monorepo)
✅ 11 passed, 1 failed, 2 warnings, 1 skipped (verify-connection.ts)
   - The 1 failure is the ElevenLabs verify script calling `/v1/user`
     (admin permission) — your key has STT/TTS scope only, so STT/TTS
     still work but the admin ping fails. Not a functional issue.
   - 2 warnings: RESEND_API_KEY not set (email disabled, WhatsApp/SMS work)
   - 1 skip: Langfuse (observability, not configured)
```
