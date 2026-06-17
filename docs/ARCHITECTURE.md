# CureV — System Architecture Documentation

## Overview

CureV is an AI-powered clinical operations platform for Indian outpatient clinics. It uses a **LangGraph multi-agent system** running on a **Next.js monorepo** deployed on Vercel, with Supabase as the database, **OpenRouter** (Hermes 3 405B primary + free fallback) as the LLM, **ElevenLabs** for voice STT/TTS, and **OpenRouter text-embedding-3-small** for RAG embeddings.

---

## Monorepo Structure

```
curev/
├── apps/
│   └── web/                   # Next.js 15 frontend + API routes
├── backend/                   # @cureva/backend — shared DB & AI clients, domain controllers
├── agents/                    # @cureva/agents — LangGraph state, nodes, orchestrator
├── mcp/                       # @cureva/mcp — MCP tool wrappers (logged to mcp_tool_calls)
├── rag/                       # @cureva/rag — Hybrid clinical knowledge retriever
├── prompts/                   # @cureva/prompts — Agent prompt templates
├── ml/                        # @cureva/ml — No-show risk prediction model
├── eval/                      # @cureva/eval — Automated evaluation scenarios
├── docs/                      # System documentation (this package)
├── backend/migrations/        # Supabase SQL migrations
└── md/                        # Source specification markdown files
```

---

## Agent System (LangGraph)

### Graph Topology

```
supervisor → [predictor | triage | scribe | prescription | recovery]
           ↓
         intervention → [escalation | audit]
           ↓
         escalation → audit → END
```

### Agent Roles

| Agent | Trigger | Primary Action |
|---|---|---|
| **Supervisor** | All events | Routes to correct agent by `event_type` |
| **Predictor** | `scheduled_risk_run` | Computes no-show risk score via ML model |
| **Intervention** | High-risk prediction | Sends SMS/WhatsApp/frontdesk alert |
| **Recovery** | `cancellation`, `no_show` | Scores waitlist, sends slot-fill outreach |
| **Triage** | `triage_request` | Routes symptoms to specialty |
| **Scribe** | `scribe_request` | Transcribes audio chunk → SOAP delta |
| **Prescription** | `prescription_request` | Suggests medications + drug interaction check |
| **Escalation** | Any `should_escalate=true` | Notifies frontdesk staff |
| **Audit** | Always last | Logs final state to DB |

### Key Rules
- Agents **NEVER** call DB directly — all DB access goes through MCP tools
- Every MCP tool call is logged to `mcp_tool_calls` table for observability
- State is **immutable** — each node returns only changed fields

---

## MCP Tool Registry

| Tool | Server | Purpose |
|---|---|---|
| `lookup_patient` | patient-mcp | Fetch patient + allergies + conditions |
| `get_medical_history` | patient-mcp | Full medical history |
| `get_attendance_history` | patient-mcp | Past appointment attendance |
| `get_contact_preferences` | patient-mcp | SMS/WhatsApp channel preference |
| `get_appointment_features` | patient-mcp | Features for risk prediction |
| `get_available_slots` | appointment-mcp | Open slots for booking |
| `update_appointment_status` | appointment-mcp | Mark completed/cancelled/no_show |
| `score_waitlist` | waitlist-mcp | Priority rank waitlist for a slot |
| `retrieve_symptom_pathway` | knowledge-mcp | RAG for symptom triage guidelines |
| `retrieve_red_flags` | knowledge-mcp | RAG for clinical red flags |
| `retrieve_drug_info` | knowledge-mcp | RAG for drug prescribing information |
| `check_drug_interaction` | knowledge-mcp | Drug-drug interaction lookup |
| `send_sms` | notification-mcp | Send SMS via provider |
| `send_whatsapp` | notification-mcp | Send WhatsApp message |
| `notify_frontdesk` | notification-mcp | Push escalation to staff dashboard |

---

## RAG Pipeline

The hybrid retriever in `rag/retriever.ts` uses:
1. **Vector Search** — pgvector cosine similarity on `knowledge_chunks` embeddings
2. **Keyword Search** — Postgres full-text search (tsvector)
3. **RRF Fusion** — Reciprocal Rank Fusion merges both result sets
4. **LLM Reranking** — OpenRouter cross-encoder final relevance pass (uses the primary chat model)

---

## ML Model

`ml/models/no-show-predictor.ts` implements a mathematical log-odds scorer simulating XGBoost output:

**Features**: new_patient, lead_time_days, distance_km, day_of_week, hour_of_day, past_no_show_rate, no_show_streak, appointment_value_inr, is_follow_up

**Output**: `{ score: 0-1, riskTier: low|medium|high|critical, factors: string[] }`

**Calibration**: Run `npx tsx ml/scripts/train.ts` to validate tier distributions.

---

## Backend Domain Controllers

Each domain in `backend/app/domains/` provides typed controller functions that the Next.js API routes call:

| Domain | Controller File | Key Functions |
|---|---|---|
| `slotsaver` | `slotsaver.controller.ts` | `getSlotSaverDashboard()`, `runSlotSaverCron()` |
| `clinical` | `clinical.controller.ts` | `listPrescriptions()`, `savePrescription()`, `upsertScribeSession()` |
| `patients` | `patients.controller.ts` | `listPatients()`, `getPatient()`, `createPatient()` |
| `appointments` | `appointments.controller.ts` | `listAppointments()`, `updateAppointmentStatus()` |
| `analytics` | `analytics.controller.ts` | `getAnalyticsKPIs()`, `getDailyMetrics()` |
| `auth` | `auth.controller.ts` | `getDoctorProfile()`, `upsertDoctorProfile()` |

---

## Deployment (Vercel)

- **Next.js API routes** in `apps/web/src/app/api/` — deployed as serverless functions
- **Workspace packages** compiled via `transpilePackages` in `next.config.ts`
- **Cron jobs** use Vercel Cron (`vercel.json`) calling `/api/slotsaver/cron`
- **Environment Variables** required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`. Optional: `ELEVENLABS_API_KEY`, `RESEND_API_KEY`.

---

## Evaluation

Run agent evaluation suite:
```bash
npx tsx eval/scenarios/run-eval.ts
```

Outputs a markdown report to `eval/scenarios/report.md` with pass/fail per scenario.

Run ML calibration:
```bash
npx tsx ml/scripts/train.ts
```
