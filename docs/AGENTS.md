# Cureva — Agent Playbooks

Reference for how each LangGraph agent is triggered, what it does, and what state it produces.

---

## Supervisor Agent

**File**: `agents/nodes.ts → supervisorNode`
**Trigger**: Entry point for all events

### Routing Table

| `event_type` | Next Agent |
|---|---|
| `cancellation` | `recovery` |
| `no_show` | `recovery` |
| `scheduled_risk_run` | `predictor` |
| `triage_request` | `triage` |
| `scribe_request` | `scribe` |
| `prescription_request` | `prescription` |
| _(default)_ | `escalation` |

---

## Predictor Agent

**File**: `agents/nodes.ts → predictorNode`
**Trigger**: `event_type = 'scheduled_risk_run'`

1. Calls `get_appointment_features` MCP tool
2. Calls `lookup_patient` MCP tool
3. Runs `predictNoShow()` from `@cureva/ml`
4. If `score >= 0.45`: routes to `intervention`
5. If `score >= 0.70`: sets `planned_intervention = 'frontdesk'`

**State Output**: `risk_score`, `risk_tier`, `risk_factors`, `planned_intervention`

---

## Intervention Agent

**File**: `agents/nodes.ts → interventionNode`
**Trigger**: After Predictor for high-risk appointments

1. Calls `get_contact_preferences` MCP tool
2. Generates personalized reminder via `interventionReminderPromptTemplate`
3. Routes: whatsapp → `send_whatsapp`, sms → `send_sms`, frontdesk → Escalation

**State Output**: `intervention_channel`, `intervention_message`, `intervention_sent`

---

## Recovery Agent

**File**: `agents/nodes.ts → recoveryNode`
**Trigger**: `event_type = 'cancellation'` or `'no_show'`

1. Calls `score_waitlist` MCP tool to get priority-ranked candidates
2. Generates outreach message via `recoveryOutreachPromptTemplate`
3. Sends via whatsapp or sms to top waitlist candidate
4. Logs to `outreach_logs`

**State Output**: `waitlist`, `outreach_attempts`, `recovery_outcome`

---

## Triage Agent

**File**: `agents/nodes.ts → triageNode`
**Trigger**: `event_type = 'triage_request'`

1. Calls `retrieve_symptom_pathway` + `retrieve_red_flags` (RAG via MCP)
2. Calls the LLM (OpenRouter primary + free fallback) with `triagePromptTemplate` to route symptoms
3. Saves triage session to `triage_sessions` table

**State Output**: `urgency`, `recommended_specialty`, `triage_confidence`, `triage_reasoning`

> ⚠️ Agents never diagnose — only route.

---

## Scribe Agent

**File**: `agents/nodes.ts → scribeNode`
**Trigger**: `event_type = 'scribe_request'`

1. Calls `transcribeAndTranslateAudio` (ElevenLabs STT + LLM translation step)
2. Calls the LLM (OpenRouter) with `scribePromptTemplate` to extract the SOAP delta
3. Merges delta into existing SOAP note immutably
4. Instant red-flag keyword matching (chest pain, suicidal, etc.)
5. Saves/updates `scribe_sessions` table

**State Output**: `transcript_chunk`, `full_transcript`, `soap_note`, `ai_alerts`

---

## Prescription Agent

**File**: `agents/nodes.ts → prescriptionNode`
**Trigger**: `event_type = 'prescription_request'`

1. Calls `lookup_patient` + `retrieve_drug_info` (RAG)
2. Calls the LLM (OpenRouter) with `prescriptionRecommenderPromptTemplate`
3. Runs drug-allergy + drug-drug interaction checks via `check_drug_interaction` MCP
4. If severe interaction detected → escalation

**State Output**: `suggested_medicines`, `drug_interactions`, `interaction_alerts`, `tests_ordered`, `follow_up_days`

---

## Escalation Agent

**File**: `agents/nodes.ts → escalationNode`
**Trigger**: Any node setting `should_escalate = true`

1. Calls `notify_frontdesk` MCP tool
2. Packages full context payload for manual review

---

## Audit Agent

**File**: `agents/nodes.ts → auditNode`
**Trigger**: Always runs last before END

1. Writes final state summary to `agent_runs` table
2. Updates risk score record if applicable
