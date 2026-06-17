# CUREVA — Complete System Design Prompt
### For: Google AI Studio (Gemini 2.5 Pro)
### Role: Lead System Design Engineer

---

## PRODUCT DEFINITION

Build **Cureva** — a production-grade, end-to-end AI-powered clinical platform for Indian clinics and hospitals.

Cureva = three products in one unified system:

```
1. SLOTSAVER          → Revenue protection (no-show prediction + slot recovery)
2. PATIENT PORTAL     → Agentic appointment booking + health timeline
3. DOCTOR WORKSPACE   → AI Scribe + prescription writer + patient summary + PDF dispatch
```

Primary users: Patients, Doctors, Clinic Admins.
Primary KPI: Revenue Protected (₹), Appointments Completed, Doctor Time Saved (min/day).

---

## ARCHITECTURE RULES (never violate)

```
1. Agents never query DB directly → only via MCP tools
2. Every LLM decision explainable + logged (Langfuse)
3. Graceful degradation on every agent failure
4. RAG grounds clinical decisions — never hallucinates drug names
5. PDF generation is deterministic — no LLM in render step
6. Voice/scribe pipeline is async — never blocks UI
7. Patient data = DPDP compliant — audit trail on every access
```

---

## COMPLETE TECH STACK

### Frontend
```
Next.js 15 (App Router)
TypeScript
TailwindCSS
shadcn/ui
Framer Motion (page transitions, micro-interactions)
TanStack Query v5
Zustand
React Hook Form + Zod
Recharts
React PDF (prescription PDF render)
Liveblocks or Yjs (real-time scribe collab)
```

### Backend
```
Python 3.11
FastAPI (async)
LangGraph (agent orchestration)
FastMCP (MCP servers)
SQLAlchemy async
Alembic (migrations)
Pydantic v2
Redis (queues + session)
Celery (async jobs: PDF gen, email dispatch)
```

### AI / ML Layer
```
Ollama — qwen3 (primary LLM, local)
Whisper — STT for AI Scribe (local)
FastEmbed / BGE-small — embeddings (local)
Qdrant — vector store
XGBoost + SHAP — no-show risk scorer
Instructor — structured LLM output
Langfuse — tracing + observability
```

### Infrastructure
```
Supabase (PostgreSQL + Auth + Storage for lab reports/PDFs)
Supabase Storage — PDF + lab report files
Redis — event queues + session cache
Qdrant — local Docker
Railway or Render — deployment
GitHub Actions — CI + eval regression
Resend — email dispatch (free tier)
Twilio sandbox — SMS/WhatsApp/Voice (mock)
```

---

## AGENT ARCHITECTURE

LangGraph. Stateful. Typed state. Supervisor pattern.

```
┌─────────────────────────────────────────────────────────────────┐
│                        SUPERVISOR AGENT                         │
│            Routes events → correct sub-agent                    │
└───┬──────────┬──────────┬───────────┬───────────┬──────────────┘
    │          │          │           │           │
    ▼          ▼          ▼           ▼           ▼
PREDICTOR  INTERVENTION RECOVERY  TRIAGE    SCRIBE
AGENT       AGENT       AGENT     AGENT     AGENT
    │          │          │           │           │
    ▼          ▼          ▼           ▼           ▼
ESCALATION            PRESCRIPTION           AUDIT
AGENT                 AGENT                  AGENT
    │
    ▼
KNOWLEDGE
AGENT (RAG)
```

### Agent Responsibilities

**Predictor Agent** — scores no-show risk per patient (XGBoost + SHAP)
**Intervention Agent** — selects channel (SMS/WA/Voice), generates personalized message
**Recovery Agent** — ranks waitlist, sends outreach, books first responder
**Triage Agent** — maps symptoms → specialty + urgency, flags red flags
**Scribe Agent** — transcribes doctor-patient conversation, extracts structured clinical data
**Prescription Agent** — suggests medications, dosage, duration based on diagnosis + patient history
**Escalation Agent** — formats handoff payload, notifies front desk
**Knowledge Agent** — RAG retrieval from clinical guidelines, SOPs, drug database
**Audit Agent** — scores every session async, writes to eval DB

---

## MCP SERVERS (complete)

All agent actions go through MCP. Any EMR plugs in by implementing these specs.

### Patient MCP
```python
lookup_patient(patient_id: str) -> PatientProfile
get_medical_history(patient_id: str) -> MedicalHistory
get_prescriptions(patient_id: str) -> Prescription[]
get_lab_reports(patient_id: str) -> LabReport[]
get_attendance_history(patient_id: str) -> AttendanceRecord[]
get_contact_preferences(patient_id: str) -> ContactPrefs
update_patient_record(patient_id: str, updates: dict) -> bool
search_patients(query: str) -> PatientProfile[]
```

### Appointment MCP
```python
book_appointment(patient_id: str, slot_id: str, reason: str) -> Booking
cancel_appointment(appointment_id: str) -> bool
reschedule_appointment(appointment_id: str, new_slot_id: str) -> Booking
get_available_slots(doctor_id: str, specialty: str, date_range: DateRange) -> Slot[]
get_cancelled_slot(slot_id: str) -> SlotDetails
confirm_appointment(appointment_id: str) -> bool
```

### Waitlist MCP
```python
get_waitlist(slot_id: str) -> WaitlistEntry[]
score_waitlist(slot_id: str) -> RankedWaitlist
add_to_waitlist(patient_id: str, specialty: str) -> WaitlistEntry
remove_from_waitlist(patient_id: str, slot_id: str) -> bool
```

### Doctor MCP
```python
lookup_doctor(doctor_id: str) -> DoctorProfile
get_doctor_schedule(doctor_id: str, date: str) -> Schedule
get_patient_queue(doctor_id: str, date: str) -> QueueEntry[]
get_doctor_availability(doctor_id: str) -> AvailabilitySlot[]
```

### Clinical MCP
```python
create_prescription(appointment_id: str, data: PrescriptionData) -> Prescription
update_prescription(prescription_id: str, updates: dict) -> Prescription
generate_prescription_pdf(prescription_id: str) -> PDFUrl
send_prescription_to_patient(prescription_id: str, channel: str) -> bool
save_clinical_note(appointment_id: str, note: ClinicalNote) -> bool
get_clinical_note(appointment_id: str) -> ClinicalNote
save_lab_order(appointment_id: str, tests: LabTest[]) -> LabOrder
```

### Knowledge MCP (RAG)
```python
retrieve_drug_info(drug_name: str) -> DrugInfo
retrieve_clinical_guideline(query: str, specialty: str) -> Guideline
retrieve_symptom_pathway(symptoms: list[str]) -> ClinicalPathway
retrieve_sop(query: str) -> SOP
retrieve_intervention_guideline(query: str, channel: str) -> Guideline
search_knowledge(query: str, filters: dict) -> KnowledgeResult[]
check_drug_interaction(drug_a: str, drug_b: str) -> InteractionResult
retrieve_dosage(drug_name: str, condition: str, patient_profile: dict) -> DosageGuide
```

### Notification MCP
```python
send_sms(patient_id: str, message: str) -> DeliveryStatus
send_whatsapp(patient_id: str, message: str) -> DeliveryStatus
initiate_call(patient_id: str, script: CallScript) -> CallSession
send_email(patient_id: str, subject: str, pdf_url: str) -> bool
notify_frontdesk(payload: EscalationPayload) -> bool
```

### Analytics MCP
```python
log_recovery_session(session_id: str, payload: dict) -> bool
get_protection_metrics(date_range: DateRange) -> ProtectionMetrics
get_scribe_metrics(doctor_id: str) -> ScribeMetrics
get_channel_effectiveness() -> ChannelStats[]
track_agent_run(agent: str, session_id: str, outcome: str) -> bool
```

---

## RAG ARCHITECTURE

RAG = knowledge supplier to agents. NOT a chatbot.

### Knowledge Sources
```
1. Indian clinical guidelines (AIIMS, WHO ICD-11)
2. Drug database (generic names, dosages, interactions)
3. Clinic SOPs
4. DPDP compliance rules
5. Symptom → specialty pathways
6. Recovery playbooks
7. Intervention effectiveness history
8. Prescription templates by specialty
```

### Retrieval Pipeline
```
Query from Agent
      ↓
BGE-small embedding
      ↓
Qdrant vector search (top-20)
      ↓
BM25 keyword search (top-20)
      ↓
Reciprocal Rank Fusion (merge + rerank)
      ↓
Cross-encoder reranker (top-5)
      ↓
Context Builder (fits agent's token budget)
      ↓
Agent uses grounded context
```

### Where RAG helps
```
Triage Agent        → symptom pathways, red flag lists
Prescription Agent  → drug info, dosage, interactions
Recovery Agent      → intervention playbooks
Escalation Agent    → escalation SOPs, compliance rules
Knowledge Agent     → all queries
```

### Where RAG does NOT help
```
Risk Scorer    → XGBoost, not retrieval
Booking flow   → deterministic DB lookup via MCP
PDF render     → template-based, no LLM
Auth/session   → deterministic
```

### Fallback
```
Qdrant unavailable → agent proceeds with LLM knowledge only
Latency > 2s       → skip RAG, log miss in Langfuse, continue
All misses logged → weekly RAG health report
```

---

## DATABASE SCHEMA

PostgreSQL via Supabase.

```sql
-- Users
users                 (id, email, role, created_at)
patients              (id, user_id, name, phone, dob, blood_group, address, distance_km)
doctors               (id, user_id, name, specialty, registration_no, clinic_id)
clinics               (id, name, address, settings_json)

-- Appointments
appointments          (id, patient_id, doctor_id, slot_time, status, specialty, value_inr, reason)
slots                 (id, doctor_id, start_time, end_time, status, appointment_id)
waitlist              (id, patient_id, specialty, doctor_id, priority_score, added_at)

-- Clinical
prescriptions         (id, appointment_id, patient_id, doctor_id, diagnosis, medicines_json,
                       instructions, follow_up_date, pdf_url, sent_at, created_at)
lab_orders            (id, appointment_id, tests_json, status, results_url, ordered_at)
clinical_notes        (id, appointment_id, doctor_id, scribe_transcript, structured_note,
                       subjective, objective, assessment, plan, created_at)
medical_history       (id, patient_id, condition, diagnosed_at, status, notes)
allergies             (id, patient_id, allergen, severity, reaction)

-- SlotSaver
cancellation_events   (id, appointment_id, cancelled_at, reason)
risk_scores           (id, appointment_id, patient_id, score, tier, features_json)
recovery_sessions     (id, slot_id, started_at, closed_at, outcome, fill_time_seconds, revenue_inr)
outreach_log          (id, session_id, patient_id, channel, message, sent_at, response)
escalations           (id, session_id, reason, payload_json, resolved_at, resolved_by)
intervention_log      (id, patient_id, appointment_id, channel, message, sent_at, response)

-- AI / Scribe
scribe_sessions       (id, appointment_id, audio_url, transcript, status, started_at, ended_at)
triage_sessions       (id, patient_id, symptoms_raw, urgency, specialty, confidence, created_at)
agent_runs            (id, session_id, agent_name, input_json, output_json, tokens, latency_ms)
mcp_tool_calls        (id, agent_run_id, tool_name, input_json, output_json, latency_ms, success)

-- Eval + Prompts
eval_results          (id, session_id, agent, metric, score, computed_at)
prompt_versions       (id, agent, version, yaml_content, active, eval_score, created_at)
ab_test_results       (id, prompt_a_id, prompt_b_id, metric, winner, confidence, period)

-- Notifications
notifications         (id, patient_id, type, payload_json, channel, sent_at, read_at)
```

---

## FRONTEND ARCHITECTURE

---

### DESIGN IDENTITY

**The brief in one sentence:**
Cureva is what happens when clinical precision meets earned calm — a platform doctors trust in the room and patients feel safe inside.

**The single risk this design takes:**
No accent color. Cureva uses surgical restraint — near-monochrome with one deliberate warm break. The only color that *means something* is status. Everything else is type weight and spatial rhythm.

**What this is NOT:**
- Not indigo SaaS dashboard (Linear clone)
- Not healthcare blue-white EMR software
- Not dark mode for dark mode's sake
- Not card-grid admin template
- Not gradient-heavy AI product theater

---

### DESIGN REFERENCES — WHAT TO STUDY

**Awwwards:**
- **Linear** — information density without noise. Every element earns its space.
- **Vercel.com** — precision typography, monochrome confidence, motion that serves not decorates
- **Stripe Dashboard** — data-heavy but never overwhelming. Trust through clarity.
- **Raycast** — keyboard-first, surgical, the product IS the typography
- **Resend.com** — minimal dark, enormous whitespace, type hierarchy as the only decoration

**Dribbble direction:**
- Search: "medical dashboard minimal dark 2024"
- Search: "clinical UI typography heavy"
- Search: "healthcare SaaS dark premium"
- What to take: spatial rhythm, type-first hierarchy, restrained color
- What to reject: glassmorphism, gradient cards, blue hospital palette

**IBM Carbon influence:**
- Productive type set — not expressive. Doctors work, not browse.
- 8px grid. Spacing by multiples of 4 and 8 only. No exceptions.
- Data density governed by proximity, not dividers
- IBM Plex Mono for all numeric data (vitals, scores, revenue, time)

**Vercel Geist influence:**
- Geist Sans as the body/UI face — engineered for screens, not print
- Weight contrast as primary hierarchy signal (400 vs 600 vs 700)
- Letter-spacing tightened at large sizes (-0.03em at 32px+)
- Line-height generous at small sizes (1.6 at 14px), tight at display (1.1 at 48px)

---

### TOKEN SYSTEM

**Ground rule:** Every token must answer "what does this communicate?" If it only answers "what does this look like?" — cut it.

#### Color
```
/* Backgrounds — 3 levels of depth, never flat */
--bg-base:      #08080C   /* page canvas — almost black, slight blue cast */
--bg-surface:   #0F0F15   /* cards, panels */
--bg-elevated:  #17171F   /* modals, dropdowns, popovers */
--bg-subtle:    #1E1E28   /* hover states, selected rows */

/* Borders — two weights */
--border-dim:   #1F1F2B   /* structural dividers, card edges */
--border-base:  #2C2C3C   /* interactive borders, inputs */
--border-focus: #FFFFFF1A /* focus ring — barely visible, intentional */

/* Text — four levels */
--text-primary:   #F0F0F5   /* headings, primary labels */
--text-secondary: #8A8A9B   /* supporting text, timestamps */
--text-tertiary:  #52525F   /* placeholder, disabled */
--text-inverse:   #08080C   /* text on light surfaces */

/* The only real color in this system — status only */
--status-safe:     #22C55E   /* confirmed, recovered, normal lab */
--status-warning:  #EAB308   /* medium risk, pending, review */
--status-danger:   #EF4444   /* high risk, critical, urgent */
--status-info:     #3B82F6   /* active session, in-progress */

/* One warm accent — used sparingly, never decoratively */
--accent:          #E8D5B0   /* warm cream — primary CTA, key numbers */
/* Why cream not indigo: doctors associate blue with system defaults.
   Cream reads as human, considered, not templated. */

/* Data visualization — 4 colors max */
--chart-1: #E8D5B0   /* primary metric */
--chart-2: #22C55E   /* positive delta */
--chart-3: #EF4444   /* negative delta */
--chart-4: #52525F   /* baseline/comparison */
```

#### Typography

**Typeface decisions:**
```
Display / Headings:  Geist (Vercel) — engineered screen font, no print warmth
Body / UI:           IBM Plex Sans — Carbon productive type set, clinical precision
Monospace / Data:    IBM Plex Mono — vitals, scores, IDs, revenue, timestamps
```

**Why this pair:**
Geist for display gives technical authority. IBM Plex Sans for body signals system — Carbon was built for complex data products (IBM Watson, RHEL). IBM Plex Mono makes numbers trustworthy — monospaced numerics don't shift layout as values change.

**Type scale (IBM Carbon productive — fixed, not fluid):**
```css
/* Labels */
--text-xs:    11px / 16px / 400 / +0.32px   /* captions, tags */
--text-sm:    12px / 16px / 400 / +0.32px   /* helper text, timestamps */

/* Body */
--text-body:  14px / 20px / 400 / +0.16px   /* primary body — Carbon body-short-01 */
--text-body-l:16px / 24px / 400 / 0px       /* long-form reading */

/* UI */
--text-ui:    14px / 18px / 600 / +0.16px   /* component headings — Carbon productive-heading-01 */
--text-ui-l:  16px / 22px / 600 / 0px       /* section headings */

/* Display */
--text-d1:    20px / 28px / 600 / -0.01em   /* card titles, major labels */
--text-d2:    28px / 36px / 700 / -0.02em   /* page titles */
--text-d3:    40px / 48px / 700 / -0.03em   /* hero numbers (₹4.2L) */
--text-d4:    56px / 60px / 700 / -0.04em   /* single KPI hero */

/* Mono — all numeric data */
--text-mono:  13px / 20px / 400 / 0px       /* inline data values */
--text-mono-l:16px / 24px / 500 / 0px       /* prominent scores, IDs */
```

**Critical typography rules:**
```
1. Never center body text. Left-align everything except single-line KPI values.
2. KPI numbers use --text-d3/d4 in IBM Plex Mono. Never Geist for numbers.
3. Section labels use ALL CAPS at --text-xs with +0.1em tracking. Sparse.
4. Line length max 72ch for any readable prose (patient summaries, notes).
5. Weight contrast drives hierarchy — never size alone.
   Wrong: 16px/400 heading + 14px/400 body (too similar)
   Right: 20px/700 heading + 14px/400 body (clear break)
6. Geist used only at 20px+. Never at body size — IBM Plex Sans for that.
```

#### Spacing (IBM Carbon 8px grid)
```
--space-1:   4px    /* tight: icon padding, tag gap */
--space-2:   8px    /* component internal: label→input */
--space-3:   12px   /* related element grouping */
--space-4:   16px   /* standard gap: list items, form rows */
--space-5:   24px   /* section padding, card internal */
--space-6:   32px   /* between sections within a card */
--space-7:   48px   /* between major page sections */
--space-8:   64px   /* page-level padding, hero breathing room */
```

**Proximity rule (IBM Carbon):** Elements sharing meaning share space. Diagnosis label + value = 4px gap. Diagnosis section + Medicines section = 32px gap. The white space tells the story.

#### Border radius
```
--radius-sm:   4px   /* tags, badges, small chips */
--radius-base: 6px   /* cards, inputs, buttons */
--radius-lg:   10px  /* modals, large panels */
--radius-full: 9999px /* pills, avatars */
```
No border-radius on data tables. No border-radius on the main layout shell. Square edges signal system precision. Rounded edges signal interactable elements.

---

### MOTION SYSTEM

**Rule: Motion earns its place or gets cut.**

IBM Carbon principle: animation is functional — it communicates state change, not personality. Vercel principle: when motion exists, it's orchestrated — one moment, not scattered effects.

```
/* Durations */
--duration-fast:    100ms   /* hover, focus — immediate feedback */
--duration-base:    200ms   /* state changes — appears/disappears */
--duration-slow:    350ms   /* page transitions, panel slides */
--duration-deliberate: 500ms /* KPI number counts, important reveals */

/* Easing */
--ease-out:   cubic-bezier(0.0, 0, 0.2, 1)    /* entering elements */
--ease-in:    cubic-bezier(0.4, 0, 1, 1)       /* exiting elements */
--ease-inout: cubic-bezier(0.4, 0, 0.2, 1)    /* repositioning */
```

**What gets animation and why:**
```
KPI numbers          → count up on mount (350ms) — makes revenue feel earned
Risk badge (critical) → 2s pulse — draws eye without disrupting
Scribe transcript    → stream character by character — live intelligence signal
Recovery timer       → real-time countdown — urgency without alarm
Active session card  → left border pulse (green) — alive, not static
Page transitions     → 200ms fade + 4px vertical slide — smooth without theater
Row hover            → 100ms bg shift — instant, no delay
Skeleton shimmer     → 1.5s infinite — never spinner
Drawer open          → 350ms ease-out from right — spatial metaphor
```

**What does NOT get animation:**
```
Static labels, headings, body text
Form inputs (distraction during data entry)
Error messages (must appear instantly)
Any element in the scribe/recording view (cognitive load)
```

---

### LAYOUT SYSTEM

**Grid:** 12-column, 24px gutter, 32px margin. IBM Carbon 2x grid.

**Sidebar:** 240px fixed on desktop. Collapses to icon-only (64px) on trigger.
Never auto-collapse on scroll. Doctor cannot lose navigation mid-appointment.

**Main content max-width:** 1280px centered. Never full-bleed on ultrawide.

**Doctor workspace exception:** Scribe page breaks max-width — transcript + SOAP = two full columns, fluid, no cap. Information cannot be truncated during live appointment.

**Density modes:**
```
Comfortable: --space-5 (24px) internal card padding — patient-facing
Compact:     --space-4 (16px) internal card padding — doctor queue view
Condensed:   --space-3 (12px) — data tables, analytics
```
Doctor defaults to Compact. Patient defaults to Comfortable. Admin gets Condensed.

---

### COMPONENT PATTERNS

**Cards:**
```css
background: var(--bg-surface);
border: 1px solid var(--border-dim);
border-radius: var(--radius-base);
padding: var(--space-5);
/* No box-shadow — depth via color, not shadow */
/* Shadow feels web 2.0. Border feels system. */
```

**Primary button:**
```css
background: var(--accent);           /* cream */
color: var(--text-inverse);          /* near-black text on cream */
border-radius: var(--radius-base);
font: 14px/18px IBM Plex Sans 600;
letter-spacing: +0.16px;
padding: 10px 16px;
/* Hover: brightness(0.92) — subtle, no scale */
```

**Status badges — the only color in the system:**
```css
/* High risk */
.badge-danger {
  color: var(--status-danger);
  background: #EF444412;
  border: 1px solid #EF444430;
  font: IBM Plex Mono 12px/16px 500;
}
/* Use monospace for score inside badge: "0.81" not "High" alone */
```

**Data tables:**
```
border-radius: 0  /* zero radius — system, not card */
Row height: 48px comfortable, 40px compact
Alternating rows: bg-base / bg-surface (2px contrast — barely visible)
Sortable columns: weight 600 + sort icon on hover only
```

**KPI cards — THE signature element:**
```
Large mono number — --text-d3 in IBM Plex Mono --accent color
Small label below — --text-xs ALL CAPS IBM Plex Sans --text-secondary
Trend indicator — colored arrow + delta, not a chart
No background card border — KPI floats on page, not boxed
```
This is the one place Cureva breaks the card pattern. KPIs are not contained — they breathe.

---

### COPY VOICE (IBM Carbon principles applied)

```
Wrong: "Your appointment has been successfully confirmed."
Right: "Confirmed — Dr. Sharma, 4:00 PM today."

Wrong: "An error occurred while processing your request."
Right: "Booking failed. Slot was taken. Choose another time."

Wrong: "AI is analyzing your symptoms..."
Right: "Checking symptoms"

Wrong: "Welcome back, Priya! How are you feeling today?"
Right: "Good morning, Priya." (then immediate action)

Wrong: "High Risk Patient Alert Notification"
Right: "Anita Singh · 0.81 risk · Dermatology, 10:00 AM"
```

**Rules:**
- Sentence case everywhere except ALL CAPS section labels
- Active voice. Button says what happens: "Book Slot" not "Confirm Selection"
- Numbers always in IBM Plex Mono in-context
- Error messages name what went wrong and what to do. Never apologize.
- AI outputs never say "I". "Symptom suggests cardiology." Not "I think this might be cardiology."

---

### THE SIGNATURE ELEMENT

**One thing Cureva will be remembered for:**

The **Revenue Ticker** on the SlotSaver dashboard.

When a slot is recovered, the ₹ saved counter increments in real-time — large IBM Plex Mono number, --accent cream color, counting up with each recovery. No animation elsewhere on the page moves. Just that number.

It communicates: the system is working. Money is being protected. Right now.

This is the moment doctors show clinic owners. This is what gets Cureva funded.

---

## FRONTEND PAGES — COMPLETE SPEC

---

### PATIENT PORTAL

---

#### P1: Patient Landing / Triage Chat

**Route:** `/patient`
**Purpose:** Patient's first screen. Describe symptoms → get specialty recommendation → book appointment. Agentic AI handles the full booking flow conversationally.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  CUREVA                               [Profile] [Notif] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│         How can we help you today, Priya?               │
│                                                         │
│    ┌─────────────────────────────────────────────┐      │
│    │ 💬 Describe what you're experiencing...     │      │
│    │ or choose: [Book Follow-up] [Lab Results]   │      │
│    └─────────────────────────────────────────────┘      │
│                                                         │
│    — or —                                               │
│                                                         │
│    [Book Appointment]  [View Prescriptions]             │
│    [Lab Reports]       [Talk to AI Agent]               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**AI Booking Agent Flow (chat UI):**
```
Patient: "I have chest pain and shortness of breath"
         ↓
AI: "These symptoms need urgent attention.
     I recommend a Cardiologist.
     Dr. Sharma has a slot today at 4 PM (2km away).
     Dr. Gupta has a slot tomorrow at 11 AM.
     Which works for you?"
         ↓
Patient: "Today 4 PM"
         ↓
AI: "Booking confirmed. Sending details to your WhatsApp."
```

**Components:**
- `TriageChat` — conversational AI interface, streaming responses
- `QuickActionGrid` — 4 primary actions with icons
- `UpcomingAppointmentBanner` — if appointment in next 24h
- `SymptomSuggestions` — common symptom chips (fever, pain, cough...)

**Context panel (right side, desktop):**
```
Your Next Appointment
Dr. Sharma, Cardiology
Tomorrow 4:00 PM
[View Details] [Reschedule]
```

---

#### P2: Appointment Booking

**Route:** `/patient/book`
**Purpose:** Full booking flow. Specialty → Doctor → Slot → Confirm.

**3-step wizard:**
```
Step 1: Select Specialty
  [Cardiology] [Ortho] [Derma] [General] [Psychiatry] [More...]

Step 2: Select Doctor
  Dr. Sharma — Cardiologist
  ★ 4.8  •  Available today  •  2km  •  ₹1,500
  [Next Available: 4:00 PM Today]  [Book]

  Dr. Gupta — Cardiologist
  ★ 4.6  •  Available tomorrow  •  5km  •  ₹1,200
  [Next Available: 11:00 AM Tomorrow]  [Book]

Step 3: Confirm
  Date: Today, 4:00 PM
  Doctor: Dr. Sharma, Cardiology
  Location: City Clinic, Sector 12
  Fee: ₹1,500
  [Confirm & Pay] [Back]
```

**Components:**
- `SpecialtyGrid` — icon cards, search filter
- `DoctorCard` — photo, rating, availability, distance, fee
- `SlotCalendar` — week view, available slots highlighted
- `BookingConfirmModal` — summary + payment mock

---

#### P3: Patient Health Dashboard

**Route:** `/patient/dashboard`
**Purpose:** Complete health timeline. Appointments, prescriptions, lab reports, AI chat.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Health Overview                          Priya Mehta   │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  SIDEBAR     │  MAIN CONTENT                            │
│              │                                          │
│  📅 Appts    │  UPCOMING                                │
│  💊 Prescr.  │  Dr. Sharma — Cardiology                 │
│  🧪 Labs     │  Tomorrow 4:00 PM                        │
│  📋 History  │  [View] [Reschedule] [Cancel]            │
│  💬 AI Chat  │                                          │
│              │  RECENT PRESCRIPTIONS                    │
│              │  Jan 15 — Dr. Sharma                     │
│              │  Atorvastatin 10mg + Aspirin 75mg        │
│              │  [View PDF] [Download]                   │
│              │                                          │
│              │  LAB REPORTS                             │
│              │  CBC — Jan 10  [Normal ✅] [View]        │
│              │  Lipid Panel — Jan 10  [⚠️ Review]       │
│              │                                          │
│              │  HEALTH TIMELINE                         │
│              │  [visual timeline — see below]           │
└──────────────┴──────────────────────────────────────────┘
```

**Health Timeline (visual):**
```
Jan ──●─────────●──────────●─── Now
      │         │          │
   Dr.Sharma  Lab CBC   Dr.Gupta
   Cardio     Normal    Follow-up
```

**Components:**
- `HealthTimeline` — horizontal scroll, events as nodes
- `PrescriptionCard` — medicines + PDF download
- `LabReportCard` — result status + file link
- `AIHealthChat` — ask questions about your health (RAG-grounded)
- `AppointmentStatusBadge` — upcoming/completed/cancelled

---

#### P4: Patient Prescription View

**Route:** `/patient/prescriptions/[id]`
**Purpose:** View single prescription in full. Download PDF. Understand medicines.

```
┌─────────────────────────────────────────────────────────┐
│  Prescription — January 15, 2025                        │
│  Dr. Sharma, Cardiologist                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  DIAGNOSIS                                              │
│  Hypertension Stage 1, Hyperlipidemia                   │
│                                                         │
│  MEDICINES                                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Atorvastatin 10mg                                 │  │
│  │ 1 tablet at night  •  30 days                    │  │
│  │ ℹ️ Take after dinner. Avoid grapefruit juice.    │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Aspirin 75mg                                      │  │
│  │ 1 tablet morning  •  30 days                     │  │
│  │ ℹ️ Take with food. Do not crush.                 │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  TESTS ORDERED                                          │
│  • Lipid Panel (fasting)  • HbA1c                       │
│                                                         │
│  FOLLOW-UP: February 15, 2025                           │
│                                                         │
│  [Download PDF]  [Share via WhatsApp]  [Book Follow-up] │
└─────────────────────────────────────────────────────────┘
```

---

### DOCTOR WORKSPACE

---

#### D1: Doctor Dashboard (Home)

**Route:** `/doctor`
**Purpose:** Daily command center. See today's queue, high-risk patients, pending tasks, SlotSaver metrics.

```
┌─────────────────────────────────────────────────────────┐
│  Good morning, Dr. Sharma            Mon, Jan 15        │
├────────────┬────────────────────────────────────────────┤
│            │                                            │
│  SIDEBAR   │  TODAY'S OVERVIEW                          │
│            │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  🏠 Home   │  │  12  │ │  3   │ │ ₹2.1L│ │  84% │      │
│  📋 Queue  │  │Appts │ │ Risk │ │Saved │ │Protect│      │
│  👥 Patients│ └──────┘ └──────┘ └──────┘ └──────┘      │
│  📝 Notes  │                                            │
│  💊 Prescr.│  TODAY'S QUEUE                             │
│  📊 SlotSvr│  09:00  Priya Mehta    Cardio  [Start]     │
│  🎙️ Scribe │  09:30  Rohit Sharma   Ortho   ⚠️ High    │
│  ⚙️ Settings│  10:00  Anita Singh   Derma   [Start]     │
│            │  10:30  [SLOT OPEN — recovering...]        │
│            │                                            │
│            │  ACTIVE RECOVERY SESSIONS                  │
│            │  🟢 10:30 slot — contacted 2/3 patients    │
│            │  Est. fill in 3 min                        │
└────────────┴────────────────────────────────────────────┘
```

**Components:**
- `DailyKPIRow` — 4 cards: appointments, high-risk, revenue saved, protection rate
- `PatientQueue` — time-sorted list, risk badges, quick-start button
- `ActiveRecoveryFeed` — live SlotSaver sessions
- `QuickActions` — [Start Scribe] [Write Prescription] [View Reports]

---

#### D2: Patient Summary Page

**Route:** `/doctor/patients/[id]`
**Purpose:** Complete 360° view of one patient before or during appointment.

```
┌─────────────────────────────────────────────────────────┐
│  Priya Mehta, 34F                   [Start Scribe] 🎙️   │
│  Blood Group: B+  •  Allergies: Penicillin              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  AI SUMMARY (generated before appointment)              │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Priya has been managing Hypertension Stage 1      │  │
│  │ since Nov 2024. Last visit Jan 5 — BP controlled  │  │
│  │ on Atorvastatin. Lipid panel shows improving LDL. │  │
│  │ She's coming today for 1-month follow-up.         │  │
│  │ ⚠️ Alert: HbA1c trending up — borderline pre-DM  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  VITALS HISTORY        PRESCRIPTIONS    LAB REPORTS     │
│  BP: 138/88 → 128/82   Jan 5 ↗ [View]  CBC [Normal]    │
│  Weight: 68kg → 67kg   Dec 1 ↗ [View]  Lipid [⚠️]     │
│  [Full Chart →]                                         │
│                                                         │
│  CLINICAL NOTES HISTORY                                 │
│  Jan 5  — Follow-up, BP improving [View]               │
│  Dec 1  — Initial consult, HTN diagnosed [View]        │
└─────────────────────────────────────────────────────────┘
```

**AI Summary Generation:**
```
Before doctor opens patient page
         ↓
Scribe Agent fetches: last 3 notes + prescriptions + labs + vitals
         ↓
LLM generates: 3-sentence briefing + alerts
         ↓
Cached for 30 min (doesn't regenerate on every click)
```

**Components:**
- `PatientHeader` — name, age, blood group, allergy badges
- `AISummaryCard` — LLM brief + alert highlights
- `VitalsTrendChart` — sparklines for BP, weight, glucose
- `TimelineSidebar` — visits in reverse chronological order
- `QuickStartScribeButton` — one click → scribe session begins

---

#### D3: AI Scribe — Live Appointment

**Route:** `/doctor/scribe/[appointment_id]`
**Purpose:** Doctor starts recording. AI transcribes conversation. Extracts structured clinical data in real-time. Doctor reviews and edits. One-click prescription generation.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  AI Scribe — Priya Mehta, Jan 15      [⏺ Recording]    │
├──────────────────────┬──────────────────────────────────┤
│  LIVE TRANSCRIPT     │  EXTRACTED DATA (live update)    │
│                      │                                  │
│  Dr: "How have you   │  SUBJECTIVE                      │
│  been feeling?"      │  Chief complaint: BP follow-up   │
│                      │  Symptoms: mild headache AM      │
│  Priya: "Better,     │                                  │
│  headaches reduced   │  OBJECTIVE                       │
│  but still get them  │  BP: [enter] Weight: [enter]     │
│  in the morning"     │                                  │
│                      │  ASSESSMENT                      │
│  Dr: "Let me check   │  HTN Stage 1 — improving         │
│  your BP..."         │  ⚠️ Consider HbA1c recheck       │
│                      │                                  │
│                      │  PLAN                            │
│                      │  Continue Atorvastatin 10mg      │
│                      │  Add: [AI suggests...] ←         │
│                      │  Tests: [HbA1c, Lipid Panel]     │
│                      │                                  │
│                      │  [Generate Prescription →]       │
└──────────────────────┴──────────────────────────────────┘
```

**Scribe Pipeline:**
```
Doctor clicks [Start Recording]
         ↓
Whisper STT → live transcript (WebSocket stream)
         ↓
Scribe Agent processes transcript chunks (every 30s)
         ↓
Extracts: symptoms, vitals mentioned, diagnosis, plan
         ↓
Fills SOAP note in real-time (right panel)
         ↓
Doctor edits inline (right panel is editable)
         ↓
[End Appointment] → final note saved
         ↓
[Generate Prescription] → Prescription Agent fires
```

**Components:**
- `LiveTranscript` — auto-scrolling, speaker-labeled
- `SOAPNoteEditor` — editable structured form, AI-filled
- `AIAlertBanner` — flags red flags in real-time ("HbA1c trending up")
- `RecordingControls` — start/pause/end + audio level indicator
- `ExtractedDataPanel` — live updating right side

---

#### D4: Prescription Writer

**Route:** `/doctor/prescriptions/new/[appointment_id]`
**Purpose:** Doctor writes diagnosis + key notes. AI suggests medicines. Doctor approves/edits. PDF generated. Sent to patient.

```
┌─────────────────────────────────────────────────────────┐
│  Prescription — Priya Mehta                             │
│  Pre-filled from Scribe ✅                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  DIAGNOSIS                                              │
│  [Hypertension Stage 1, Hyperlipidemia        ✎ edit]  │
│                                                         │
│  AI SUGGESTED MEDICINES                                 │
│  (based on diagnosis + patient history + drug DB)       │
│                                                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ✅ Atorvastatin 10mg                               │ │
│  │ 1 tablet at night after dinner • 30 days          │ │
│  │ Why: LDL elevated, no statin allergy, cost-eff.   │ │
│  │ [Keep] [Edit] [Remove]                             │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ✅ Aspirin 75mg                                    │ │
│  │ 1 tablet morning with food • 30 days              │ │
│  │ Why: Cardiovascular risk reduction                 │ │
│  │ [Keep] [Edit] [Remove]                             │ │
│  └────────────────────────────────────────────────────┘ │
│  [+ Add Medicine manually]                              │
│                                                         │
│  TESTS ORDERED                                          │
│  [HbA1c ×]  [Lipid Panel ×]  [+ Add Test]             │
│                                                         │
│  INSTRUCTIONS                                           │
│  [Low sodium diet. Walk 30 min daily. Return in 30d]   │
│                                                         │
│  FOLLOW-UP DATE                                         │
│  [February 15, 2025    📅]                              │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │           PRESCRIPTION PREVIEW                   │   │
│  │     [live PDF preview renders here]              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  [Generate PDF]  [Send to Patient]  [Print]            │
└─────────────────────────────────────────────────────────┘
```

**Prescription Agent Flow:**
```
Doctor clicks [Generate Prescription]
         ↓
Prescription Agent reads: diagnosis + patient history + allergies
         ↓
Knowledge MCP → retrieve_drug_info() for each drug
         ↓
Knowledge MCP → check_drug_interaction() for all pairs
         ↓
Knowledge MCP → retrieve_dosage() per drug + condition + patient age/weight
         ↓
Structured output: medicines[] + doses + durations + warnings
         ↓
Doctor reviews → edits inline
         ↓
[Generate PDF] → React PDF renders deterministic template
         ↓
Supabase Storage → PDF saved, URL generated
         ↓
[Send to Patient] → Notification MCP → send_email() + send_whatsapp()
```

**Drug Interaction Check UI:**
```
⚠️ Interaction Detected
Aspirin + Ibuprofen → increased bleeding risk
→ [Remove Ibuprofen] [Keep anyway + note]
```

**Components:**
- `DiagnosisInput` — editable, AI-prefilled from scribe
- `MedicineSuggestionCard` — drug + dose + reasoning + actions
- `DrugInteractionAlert` — auto-fires if interaction found
- `LabOrderSelector` — searchable test list
- `PrescriptionPreview` — live PDF preview (React PDF)
- `SendModal` — choose channel: WhatsApp / Email / SMS

---

#### D5: Prescription PDF Template

**Generated PDF structure (deterministic, no LLM in render):**
```
┌─────────────────────────────────────────────────────────┐
│  CUREVA                           City Clinic, Delhi    │
│                                   +91 11 XXXX XXXX      │
├─────────────────────────────────────────────────────────┤
│  Patient: Priya Mehta             Date: Jan 15, 2025    │
│  Age: 34F  •  ID: P-1042          Dr: Dr. Sharma, MD   │
│  Reg No: MCI/DL/2018/XXXXX                              │
├─────────────────────────────────────────────────────────┤
│  Diagnosis: Hypertension Stage 1, Hyperlipidemia        │
├─────────────────────────────────────────────────────────┤
│  Rx                                                     │
│                                                         │
│  1. Atorvastatin 10mg                                   │
│     1-0-1 (morning-afternoon-night) × 30 days           │
│     Take after dinner                                   │
│                                                         │
│  2. Aspirin 75mg                                        │
│     1-0-0 × 30 days                                     │
│     Take with food                                      │
├─────────────────────────────────────────────────────────┤
│  Tests: HbA1c (fasting), Lipid Panel                    │
├─────────────────────────────────────────────────────────┤
│  Instructions: Low sodium diet. Walk 30 min/day.        │
│  Follow-up: February 15, 2025                           │
├─────────────────────────────────────────────────────────┤
│  [Digital Signature]              [Clinic Stamp]        │
└─────────────────────────────────────────────────────────┘
```

---

#### D6: SlotSaver Dashboard (Doctor View)

**Route:** `/doctor/slotsaver`
**Purpose:** Doctor sees revenue protection metrics, active recovery sessions, high-risk patients, today's escalations.

```
┌─────────────────────────────────────────────────────────┐
│  SlotSaver — Revenue Protection                         │
├─────────────────────────────────────────────────────────┤
│  THIS MONTH                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │  ₹4.2L  │ │   84%    │ │ 6m 40s  │ │   188    │   │
│  │  Saved  │ │Protected │ │Avg Fill │ │Prevented │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                         │
│  TOMORROW'S RISK                                        │
│  🔴 High Risk: 8 patients flagged for intervention      │
│  [View All] [Approve Auto-Intervention]                 │
│                                                         │
│  ACTIVE SESSIONS                                        │
│  🟢 4:00 PM Cardiology — Priya contacted (3 min ago)   │
│  🟡 5:30 PM Ortho — escalated to front desk            │
│                                                         │
│  REVENUE CHART (30 days)                               │
│  [Line chart — daily ₹ saved]                          │
└─────────────────────────────────────────────────────────┘
```

---

#### D7: Doctor Notes / Clinical Timeline

**Route:** `/doctor/patients/[id]/notes`
**Purpose:** All past clinical notes for a patient. Searchable. Exportable.

**Components:**
- `NoteTimeline` — vertical list, newest first
- `SOAPNoteCard` — structured S/O/A/P with expand
- `TranscriptDrawer` — view original scribe transcript
- `ExportButton` — export all notes as PDF

---

### ADMIN DASHBOARD

---

#### A1: Clinic Analytics

**Route:** `/admin`
**Purpose:** Clinic owner view. Revenue, utilization, agent performance.

```
┌─────────────────────────────────────────────────────────┐
│  Clinic Overview — City Clinic             [This Month] │
├─────────────────────────────────────────────────────────┤
│  ₹18.4L Revenue  •  84% Utilization  •  312 Patients    │
│                                                         │
│  SLOTSAVER          SCRIBE              APPOINTMENTS    │
│  ₹4.2L saved       48 notes/day        94% completion   │
│  84% protection    12 min saved/appt   8.2% no-show     │
│                                                         │
│  [Revenue Chart]  [Doctor Leaderboard]  [Risk Trends]   │
└─────────────────────────────────────────────────────────┘
```

---

## FRONTEND FOLDER STRUCTURE

```
cureva/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── patient/
│   │   ├── page.tsx                  ← triage chat + landing
│   │   ├── dashboard/page.tsx        ← health dashboard
│   │   ├── book/page.tsx             ← appointment booking
│   │   └── prescriptions/[id]/page.tsx
│   ├── doctor/
│   │   ├── page.tsx                  ← doctor home
│   │   ├── patients/[id]/page.tsx    ← patient 360
│   │   ├── scribe/[id]/page.tsx      ← live scribe
│   │   ├── prescriptions/new/[id]/page.tsx
│   │   ├── slotsaver/page.tsx        ← revenue protection
│   │   └── notes/page.tsx
│   └── admin/
│       └── page.tsx
├── components/
│   ├── patient/
│   │   ├── TriageChat.tsx
│   │   ├── AppointmentWizard.tsx
│   │   ├── HealthTimeline.tsx
│   │   ├── PrescriptionCard.tsx
│   │   └── LabReportCard.tsx
│   ├── doctor/
│   │   ├── PatientQueue.tsx
│   │   ├── AISummaryCard.tsx
│   │   ├── LiveScribe.tsx
│   │   ├── SOAPNoteEditor.tsx
│   │   ├── PrescriptionWriter.tsx
│   │   ├── MedicineSuggestionCard.tsx
│   │   ├── DrugInteractionAlert.tsx
│   │   ├── PrescriptionPreview.tsx
│   │   └── SlotSaverFeed.tsx
│   ├── slotsaver/
│   │   ├── RecoverySession.tsx
│   │   ├── WaitlistRanking.tsx
│   │   ├── RiskBadge.tsx
│   │   ├── EscalationCard.tsx
│   │   └── RevenueChart.tsx
│   └── shared/
│       ├── KPICard.tsx
│       ├── Timeline.tsx
│       ├── AgentMonitor.tsx
│       └── PromptRegistry.tsx
├── lib/
│   ├── mock/
│   │   ├── patients.ts
│   │   ├── doctors.ts
│   │   ├── appointments.ts
│   │   ├── prescriptions.ts
│   │   ├── recovery-sessions.ts
│   │   └── api.ts                    ← mock API with realistic delays
│   └── api/                          ← real API (Phase 2, swap-in)
└── styles/
    └── globals.css
```

---

## COMPLETE ROADMAP

### Phase 1 — Frontend (Days 1–6)
```
Day 1: Setup + design system + shared components + mock data
Day 2: Patient portal (triage chat + booking wizard + dashboard)
Day 3: Doctor home + patient 360 + queue
Day 4: AI Scribe UI (layout + transcript + SOAP editor)
Day 5: Prescription writer + PDF preview + send modal
Day 6: SlotSaver dashboard + admin analytics + agent monitor
```
Deliverable: Full clickable frontend. Demo-ready. Zero backend.

### Phase 2 — Backend Foundation (Days 7–10)
```
Day 7:  FastAPI setup, DB schema, Alembic migrations, seed data
Day 8:  Auth (Supabase Auth), patient + doctor + admin roles
Day 9:  All MCP servers (Patient, Appointment, Doctor, Clinical, Notification)
Day 10: Risk scorer (XGBoost + SHAP), Supabase Storage for PDFs
```

### Phase 3 — Agent Layer (Days 11–15)
```
Day 11: LangGraph setup, Supervisor + Predictor agents
Day 12: Intervention + Recovery agents (SlotSaver core loop)
Day 13: Triage Agent + Clinical Routing Agent
Day 14: Scribe Agent (Whisper STT + structured extraction)
Day 15: Prescription Agent (drug suggestions + interaction check)
```

### Phase 4 — RAG Layer (Days 16–18)
```
Day 16: Qdrant setup, document ingestion pipeline, BGE-small embeddings
Day 17: Hybrid retrieval (vector + BM25 + RRF), reranker, Knowledge MCP
Day 18: Wire RAG to Triage + Prescription agents, test grounding
```

### Phase 5 — PDF + Dispatch (Days 19–20)
```
Day 19: React PDF prescription template, Supabase Storage upload
Day 20: Notification MCP → email (Resend) + WhatsApp (Twilio sandbox)
```

### Phase 6 — Eval + Prompt CI (Days 21–23)
```
Day 21: Langfuse tracing, eval harness, 100 test cases
Day 22: GitHub Actions CI, prompt regression, A/B infra
Day 23: Health Bot Evaluation Suite (100 triage scenarios, 3 bot comparison)
```

### Phase 7 — Connect Frontend (Days 24–25)
```
Replace mock API with real FastAPI
TanStack Query swap — zero component changes
```

### Phase 8 — Polish + Deploy (Days 26–28)
```
Railway/Render deploy, Qdrant hosted, Supabase prod
Performance audit, mobile responsiveness
Demo recording for Eka application
```

---

## UI/UX DESIGN SUGGESTIONS FOR AI STUDIO

### Awwwards-level patterns to implement:

**1. Depth layers**
Use 3 levels of dark: `#0A0A0F` (bg) → `#111118` (cards) → `#1A1A24` (modals). Never flat.

**2. Micro-interactions**
Every state change has motion. Risk badge pulses. Revenue counter ticks up. Scribe transcript streams character by character.

**3. Data density done right**
Linear-style: information dense but never cluttered. Use monospace for numbers. Use color only for meaning (not decoration).

**4. Progressive disclosure**
Patient card shows summary. Click → expands to full history. Never overwhelming.

**5. Real-time feel**
SlotSaver sessions update live. Scribe transcript streams. Recovery timer counts down. Use WebSocket or SSE for live data in mock via setTimeout simulation.

**6. AI transparency**
Every AI suggestion shows why. Medicine card shows reasoning. Risk badge shows top factors. Triage shows confidence score. Never a black box.

**7. Empty states with purpose**
No empty slots should show "Start recovery" CTA. No appointments shows "Book your first appointment" with triage chat. Every empty state has an action.

**8. Mobile doctor experience**
Doctor queue should work on iPad. Scribe UI collapses to transcript-first on mobile. Prescription writer uses bottom sheet for medicine add.

---

## THE PITCH (for Eka application)

> "Built Cureva — an end-to-end AI clinical platform combining revenue protection (SlotSaver), an AI scribe that converts doctor-patient conversations into structured SOAP notes, an agentic prescription writer with drug interaction checking grounded in RAG, and a patient portal with conversational appointment booking. Multi-agent LangGraph system with 9 specialized agents, 7 MCP servers, hybrid RAG retrieval from clinical guidelines, and automated eval CI. Every agent decision is explainable, logged in Langfuse, and scored. Prescription PDFs generated deterministically and dispatched via WhatsApp and email."

---

**One platform. Three products. Every layer justified.**
