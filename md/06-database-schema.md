# CUREVA — Database Schema + Seed Data
### Prompt 06 of 20
### Role: Senior Database Engineer

---

## ROLE

Senior database engineer. Build complete Cureva PostgreSQL schema with
Alembic migrations, Supabase RLS policies, and full seed data script.

Seed data must match frontend mock data shapes exactly.
Every ID format, field name, and enum value must be identical to
what the frontend expects — zero mismatch at connect time.

---

## STACK

```
PostgreSQL 15 (hosted on Supabase)
Alembic (migrations)
asyncpg (driver)
Python seed script (generates realistic Indian clinic data)
Faker (Indian names, addresses)
```

---

## SEED TARGETS

```
Clinics:           2
Doctors:           10  (3 cardiology, 2 ortho, 2 derma, 2 general, 1 psychiatry)
Patients:          200 (Indian names, Delhi/Mumbai/Bangalore)
Users:             212 (200 patients + 10 doctors + 1 admin + 1 frontdesk)
Slots:             1400 (140 per doctor, 14 days forward)
Appointments:      500 (mix of statuses)
Waitlist:          180 entries
Prescriptions:     320
Lab orders:        280
Clinical notes:    280
Medical history:   400 records
Risk scores:       500 (tomorrow's appointments scored)
Recovery sessions: 50  (30 days history)
Outreach logs:     150
Interventions:     200
Escalations:       24
Agent runs:        1000
Notifications:     300
```

---

## FOLDER STRUCTURE

```
backend/
├── migrations/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       ├── 001_initial_schema.py
│       ├── 002_indexes_and_constraints.py
│       └── 003_rls_policies.py
│
└── scripts/
    ├── seed.py              ← main entry point
    ├── seed_users.py
    ├── seed_clinical.py
    ├── seed_slotsaver.py
    ├── seed_analytics.py
    └── data/
        ├── indian_names.py  ← 500 realistic names
        ├── conditions.py    ← 50 medical conditions
        ├── drugs.py         ← 40 common drugs
        └── symptoms.py      ← symptom sets per specialty
```

---

## MIGRATION 001 — COMPLETE SCHEMA

```python
# migrations/versions/001_initial_schema.py
"""Initial schema"""
revision = "001"
down_revision = None

def upgrade():
    op.execute("""

    -- ════════════════════════════════════════════
    -- ENUMS
    -- ════════════════════════════════════════════

    CREATE TYPE user_role AS ENUM (
        'patient', 'doctor', 'admin', 'frontdesk'
    );

    CREATE TYPE appointment_status AS ENUM (
        'scheduled', 'confirmed', 'in_progress',
        'completed', 'cancelled', 'no_show'
    );

    CREATE TYPE slot_status AS ENUM (
        'available', 'booked', 'blocked', 'cancelled'
    );

    CREATE TYPE risk_tier AS ENUM (
        'low', 'medium', 'high', 'critical'
    );

    CREATE TYPE intervention_channel AS ENUM (
        'sms', 'whatsapp', 'voice_call', 'frontdesk'
    );

    CREATE TYPE session_outcome AS ENUM (
        'active', 'recovered', 'escalated', 'lost'
    );

    CREATE TYPE escalation_status AS ENUM (
        'open', 'resolved', 'dismissed'
    );

    CREATE TYPE notification_type AS ENUM (
        'slot_recovered', 'recovery_started', 'escalation_needed',
        'slot_lost', 'risk_flagged', 'intervention_sent',
        'appointment_confirmed', 'prescription_ready', 'lab_ready'
    );

    CREATE TYPE lab_status AS ENUM (
        'ordered', 'sample_collected', 'processing', 'ready', 'delivered'
    );

    -- ════════════════════════════════════════════
    -- CORE TABLES
    -- ════════════════════════════════════════════

    CREATE TABLE users (
        id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        email           VARCHAR(255) UNIQUE NOT NULL,
        hashed_password VARCHAR(255) NOT NULL,
        role            user_role NOT NULL,
        is_active       BOOLEAN DEFAULT TRUE,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE clinics (
        id           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name         VARCHAR(200) NOT NULL,
        address      VARCHAR(500),
        city         VARCHAR(100),
        phone        VARCHAR(20),
        settings     JSONB DEFAULT '{
            "slot_duration_minutes": 30,
            "working_hours": {"start": "09:00", "end": "18:00"},
            "working_days": [1,2,3,4,5,6],
            "escalation_threshold_minutes": 15
        }'::jsonb,
        created_at   TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE doctors (
        id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id         VARCHAR(36) UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        clinic_id       VARCHAR(36) REFERENCES clinics(id),
        name            VARCHAR(200) NOT NULL,
        specialty       VARCHAR(100) NOT NULL,
        qualification   VARCHAR(200),
        registration_no VARCHAR(50),
        phone           VARCHAR(20),
        schedule_config JSONB DEFAULT '{
            "working_days": [1,2,3,4,5,6],
            "start_time": "09:00",
            "end_time": "18:00",
            "slot_duration_minutes": 30,
            "break_start": "13:00",
            "break_end": "14:00"
        }'::jsonb,
        consultation_fee_inr INTEGER DEFAULT 1500,
        rating          DECIMAL(2,1) DEFAULT 4.5,
        review_count    INTEGER DEFAULT 0,
        created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE patients (
        id           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id      VARCHAR(36) UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        name         VARCHAR(200) NOT NULL,
        phone        VARCHAR(20),
        dob          DATE,
        gender       VARCHAR(10),
        blood_group  VARCHAR(5),
        address      VARCHAR(500),
        city         VARCHAR(100),
        distance_km  DECIMAL(5,2) DEFAULT 0,
        preferences  JSONB DEFAULT '{
            "preferred_doctor_id": null,
            "preferred_language": "english",
            "preferred_window": "morning",
            "preferred_channel": "whatsapp",
            "recurring_schedule_days": null,
            "avoid_days": []
        }'::jsonb,
        is_active    BOOLEAN DEFAULT TRUE,
        created_at   TIMESTAMPTZ DEFAULT NOW()
    );

    -- ════════════════════════════════════════════
    -- APPOINTMENTS
    -- ════════════════════════════════════════════

    CREATE TABLE slots (
        id             VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        doctor_id      VARCHAR(36) NOT NULL REFERENCES doctors(id),
        start_time     TIMESTAMPTZ NOT NULL,
        end_time       TIMESTAMPTZ NOT NULL,
        status         slot_status DEFAULT 'available',
        appointment_id VARCHAR(36),
        created_at     TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE appointments (
        id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        patient_id          VARCHAR(36) NOT NULL REFERENCES patients(id),
        doctor_id           VARCHAR(36) NOT NULL REFERENCES doctors(id),
        slot_id             VARCHAR(36) REFERENCES slots(id),
        slot_time           TIMESTAMPTZ NOT NULL,
        status              appointment_status NOT NULL DEFAULT 'scheduled',
        specialty           VARCHAR(100),
        value_inr           INTEGER DEFAULT 0,
        reason              VARCHAR(500) DEFAULT '',
        is_new_patient      BOOLEAN DEFAULT FALSE,
        is_follow_up        BOOLEAN DEFAULT FALSE,
        lead_time_days      INTEGER DEFAULT 0,
        cancelled_at        TIMESTAMPTZ,
        cancellation_reason VARCHAR(200) DEFAULT '',
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE waitlist (
        id             VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        patient_id     VARCHAR(36) NOT NULL REFERENCES patients(id),
        specialty      VARCHAR(100),
        doctor_id      VARCHAR(36) REFERENCES doctors(id),
        priority_score DECIMAL(4,3) DEFAULT 0,
        wait_days      INTEGER DEFAULT 0,
        urgency        VARCHAR(20) DEFAULT 'low',
        added_at       TIMESTAMPTZ DEFAULT NOW(),
        expires_at     TIMESTAMPTZ,
        is_active      BOOLEAN DEFAULT TRUE
    );

    -- ════════════════════════════════════════════
    -- CLINICAL
    -- ════════════════════════════════════════════

    CREATE TABLE medical_history (
        id           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        patient_id   VARCHAR(36) NOT NULL REFERENCES patients(id),
        condition    VARCHAR(200) NOT NULL,
        diagnosed_at DATE,
        status       VARCHAR(20) DEFAULT 'active',
        notes        VARCHAR(500) DEFAULT '',
        created_at   TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE allergies (
        id         VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
        allergen   VARCHAR(100) NOT NULL,
        severity   VARCHAR(20) DEFAULT 'moderate',
        reaction   VARCHAR(200) DEFAULT ''
    );

    CREATE TABLE prescriptions (
        id            VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        appointment_id VARCHAR(36) NOT NULL REFERENCES appointments(id),
        patient_id    VARCHAR(36) NOT NULL REFERENCES patients(id),
        doctor_id     VARCHAR(36) NOT NULL REFERENCES doctors(id),
        diagnosis     VARCHAR(500) NOT NULL,
        medicines     JSONB DEFAULT '[]'::jsonb,
        -- medicines: [{name, strength, dosage, duration_days, instructions, category}]
        tests_ordered JSONB DEFAULT '[]'::jsonb,
        instructions  TEXT DEFAULT '',
        follow_up_date DATE,
        pdf_url       VARCHAR(500) DEFAULT '',
        sent_at       TIMESTAMPTZ,
        sent_channel  VARCHAR(20) DEFAULT '',
        created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE lab_orders (
        id             VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        appointment_id VARCHAR(36) NOT NULL REFERENCES appointments(id),
        patient_id     VARCHAR(36) NOT NULL REFERENCES patients(id),
        doctor_id      VARCHAR(36) NOT NULL REFERENCES doctors(id),
        tests          JSONB DEFAULT '[]'::jsonb,
        -- tests: [{name, fasting_required, instructions}]
        status         lab_status DEFAULT 'ordered',
        results        JSONB DEFAULT '[]'::jsonb,
        -- results: [{param, value, unit, reference_range, status}]
        results_url    VARCHAR(500) DEFAULT '',
        ordered_at     TIMESTAMPTZ DEFAULT NOW(),
        results_at     TIMESTAMPTZ
    );

    CREATE TABLE clinical_notes (
        id                VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        appointment_id    VARCHAR(36) UNIQUE NOT NULL REFERENCES appointments(id),
        doctor_id         VARCHAR(36) NOT NULL REFERENCES doctors(id),
        scribe_transcript TEXT DEFAULT '',
        subjective        TEXT DEFAULT '',
        objective         JSONB DEFAULT '{
            "bp": "", "weight": null, "heart_rate": null,
            "temperature": null, "spo2": null, "other": ""
        }'::jsonb,
        assessment        TEXT DEFAULT '',
        plan              TEXT DEFAULT '',
        ai_alerts         JSONB DEFAULT '[]'::jsonb,
        -- ai_alerts: [{message, severity, source}]
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE scribe_sessions (
        id             VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        appointment_id VARCHAR(36) NOT NULL REFERENCES appointments(id),
        audio_url      VARCHAR(500) DEFAULT '',
        transcript     TEXT DEFAULT '',
        status         VARCHAR(20) DEFAULT 'active',
        -- active | processing | completed | failed
        word_count     INTEGER DEFAULT 0,
        duration_sec   INTEGER DEFAULT 0,
        started_at     TIMESTAMPTZ DEFAULT NOW(),
        ended_at       TIMESTAMPTZ
    );

    CREATE TABLE triage_sessions (
        id            VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        patient_id    VARCHAR(36) NOT NULL REFERENCES patients(id),
        symptoms_raw  TEXT NOT NULL,
        urgency       VARCHAR(20),
        specialty     VARCHAR(100),
        confidence    DECIMAL(4,3),
        reasoning     TEXT DEFAULT '',
        escalated     BOOLEAN DEFAULT FALSE,
        appointment_id VARCHAR(36) REFERENCES appointments(id),
        created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    -- ════════════════════════════════════════════
    -- SLOTSAVER
    -- ════════════════════════════════════════════

    CREATE TABLE risk_scores (
        id                   VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        appointment_id       VARCHAR(36) NOT NULL REFERENCES appointments(id),
        patient_id           VARCHAR(36) NOT NULL REFERENCES patients(id),
        score                DECIMAL(4,3) NOT NULL,
        tier                 risk_tier NOT NULL,
        features             JSONB DEFAULT '{}'::jsonb,
        top_factors          JSONB DEFAULT '[]'::jsonb,
        planned_intervention intervention_channel,
        intervention_time    TIMESTAMPTZ,
        computed_at          TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE cancellation_events (
        id             VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        appointment_id VARCHAR(36) NOT NULL REFERENCES appointments(id),
        slot_id        VARCHAR(36) NOT NULL REFERENCES slots(id),
        cancelled_at   TIMESTAMPTZ DEFAULT NOW(),
        cancelled_by   VARCHAR(20) DEFAULT 'patient',
        reason         VARCHAR(200) DEFAULT '',
        recovery_session_id VARCHAR(36)
    );

    CREATE TABLE recovery_sessions (
        id                 VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        slot_id            VARCHAR(36) NOT NULL REFERENCES slots(id),
        cancellation_event_id VARCHAR(36) REFERENCES cancellation_events(id),
        started_at         TIMESTAMPTZ DEFAULT NOW(),
        closed_at          TIMESTAMPTZ,
        outcome            session_outcome DEFAULT 'active',
        fill_time_seconds  INTEGER,
        revenue_inr        INTEGER DEFAULT 0,
        patients_contacted INTEGER DEFAULT 0,
        filled_by_patient  VARCHAR(36) REFERENCES patients(id)
    );

    CREATE TABLE outreach_log (
        id           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        session_id   VARCHAR(36) NOT NULL REFERENCES recovery_sessions(id),
        patient_id   VARCHAR(36) NOT NULL REFERENCES patients(id),
        rank         INTEGER NOT NULL,
        score        DECIMAL(4,3),
        message      TEXT NOT NULL,
        channel      intervention_channel NOT NULL,
        sent_at      TIMESTAMPTZ DEFAULT NOW(),
        delivered_at TIMESTAMPTZ,
        response     VARCHAR(100),
        responded_at TIMESTAMPTZ,
        outcome      VARCHAR(20) DEFAULT 'pending'
        -- pending | confirmed | declined | no_response
    );

    CREATE TABLE escalations (
        id           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        session_id   VARCHAR(36) NOT NULL REFERENCES recovery_sessions(id),
        reason       VARCHAR(50) NOT NULL,
        -- no_response_timeout | low_confidence | all_declined | manual
        payload      JSONB DEFAULT '{}'::jsonb,
        notified_at  TIMESTAMPTZ DEFAULT NOW(),
        resolved_at  TIMESTAMPTZ,
        resolved_by  VARCHAR(100) DEFAULT '',
        resolution_note VARCHAR(500) DEFAULT '',
        status       escalation_status DEFAULT 'open',
        revenue_recovered_inr INTEGER DEFAULT 0
    );

    CREATE TABLE intervention_log (
        id             VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        patient_id     VARCHAR(36) NOT NULL REFERENCES patients(id),
        appointment_id VARCHAR(36) NOT NULL REFERENCES appointments(id),
        risk_score     DECIMAL(4,3),
        channel        intervention_channel NOT NULL,
        message        TEXT NOT NULL,
        sent_at        TIMESTAMPTZ DEFAULT NOW(),
        response       VARCHAR(100),
        responded_at   TIMESTAMPTZ,
        outcome        VARCHAR(20) DEFAULT 'pending',
        -- pending | confirmed | declined | rescheduled | no_response
        response_time_seconds INTEGER
    );

    -- ════════════════════════════════════════════
    -- AI / AGENTS
    -- ════════════════════════════════════════════

    CREATE TABLE agent_runs (
        id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        session_id  VARCHAR(100),
        agent_name  VARCHAR(50) NOT NULL,
        input_json  JSONB DEFAULT '{}'::jsonb,
        output_json JSONB DEFAULT '{}'::jsonb,
        tokens_used INTEGER DEFAULT 0,
        latency_ms  INTEGER DEFAULT 0,
        success     BOOLEAN DEFAULT TRUE,
        error       TEXT DEFAULT '',
        created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE mcp_tool_calls (
        id           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        agent_run_id VARCHAR(36) REFERENCES agent_runs(id),
        tool_name    VARCHAR(100) NOT NULL,
        mcp_server   VARCHAR(50),
        input_json   JSONB DEFAULT '{}'::jsonb,
        output_json  JSONB DEFAULT '{}'::jsonb,
        latency_ms   INTEGER DEFAULT 0,
        success      BOOLEAN DEFAULT TRUE,
        error        TEXT DEFAULT '',
        created_at   TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE eval_results (
        id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        session_id  VARCHAR(100),
        agent       VARCHAR(50),
        metric      VARCHAR(100),
        score       DECIMAL(5,4),
        details     JSONB DEFAULT '{}'::jsonb,
        computed_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE prompt_versions (
        id           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        prompt_id    VARCHAR(100) NOT NULL,
        agent        VARCHAR(50) NOT NULL,
        version      VARCHAR(20) NOT NULL,
        yaml_content TEXT NOT NULL,
        active       BOOLEAN DEFAULT FALSE,
        eval_score   DECIMAL(4,3) DEFAULT 0,
        runs_count   INTEGER DEFAULT 0,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(prompt_id, version)
    );

    CREATE TABLE ab_test_results (
        id            VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        prompt_a_id   VARCHAR(36) REFERENCES prompt_versions(id),
        prompt_b_id   VARCHAR(36) REFERENCES prompt_versions(id),
        metric        VARCHAR(100),
        a_score       DECIMAL(4,3),
        b_score       DECIMAL(4,3),
        winner        VARCHAR(5),
        confidence    DECIMAL(4,3),
        sample_size   INTEGER,
        period_start  TIMESTAMPTZ,
        period_end    TIMESTAMPTZ,
        created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    -- ════════════════════════════════════════════
    -- NOTIFICATIONS
    -- ════════════════════════════════════════════

    CREATE TABLE notifications (
        id         VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id    VARCHAR(36) REFERENCES users(id),
        patient_id VARCHAR(36) REFERENCES patients(id),
        type       notification_type NOT NULL,
        title      VARCHAR(200),
        body       VARCHAR(1000),
        payload    JSONB DEFAULT '{}'::jsonb,
        channel    VARCHAR(20) DEFAULT 'in_app',
        sent_at    TIMESTAMPTZ DEFAULT NOW(),
        read_at    TIMESTAMPTZ,
        is_read    BOOLEAN DEFAULT FALSE
    );

    -- ════════════════════════════════════════════
    -- AUDIT (DPDP COMPLIANCE)
    -- ════════════════════════════════════════════

    CREATE TABLE audit_log (
        id         BIGSERIAL PRIMARY KEY,
        user_id    VARCHAR(36),
        resource   VARCHAR(200),
        method     VARCHAR(10),
        ip_address VARCHAR(45),
        user_agent VARCHAR(500),
        timestamp  TIMESTAMPTZ DEFAULT NOW()
    );

    """)


def downgrade():
    op.execute("""
        DROP TABLE IF EXISTS audit_log CASCADE;
        DROP TABLE IF EXISTS notifications CASCADE;
        DROP TABLE IF EXISTS ab_test_results CASCADE;
        DROP TABLE IF EXISTS prompt_versions CASCADE;
        DROP TABLE IF EXISTS eval_results CASCADE;
        DROP TABLE IF EXISTS mcp_tool_calls CASCADE;
        DROP TABLE IF EXISTS agent_runs CASCADE;
        DROP TABLE IF EXISTS intervention_log CASCADE;
        DROP TABLE IF EXISTS escalations CASCADE;
        DROP TABLE IF EXISTS outreach_log CASCADE;
        DROP TABLE IF EXISTS recovery_sessions CASCADE;
        DROP TABLE IF EXISTS cancellation_events CASCADE;
        DROP TABLE IF EXISTS risk_scores CASCADE;
        DROP TABLE IF EXISTS triage_sessions CASCADE;
        DROP TABLE IF EXISTS scribe_sessions CASCADE;
        DROP TABLE IF EXISTS clinical_notes CASCADE;
        DROP TABLE IF EXISTS lab_orders CASCADE;
        DROP TABLE IF EXISTS prescriptions CASCADE;
        DROP TABLE IF EXISTS allergies CASCADE;
        DROP TABLE IF EXISTS medical_history CASCADE;
        DROP TABLE IF EXISTS waitlist CASCADE;
        DROP TABLE IF EXISTS appointments CASCADE;
        DROP TABLE IF EXISTS slots CASCADE;
        DROP TABLE IF EXISTS patients CASCADE;
        DROP TABLE IF EXISTS doctors CASCADE;
        DROP TABLE IF EXISTS clinics CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP TYPE IF EXISTS notification_type CASCADE;
        DROP TYPE IF EXISTS escalation_status CASCADE;
        DROP TYPE IF EXISTS session_outcome CASCADE;
        DROP TYPE IF EXISTS intervention_channel CASCADE;
        DROP TYPE IF EXISTS risk_tier CASCADE;
        DROP TYPE IF EXISTS slot_status CASCADE;
        DROP TYPE IF EXISTS appointment_status CASCADE;
        DROP TYPE IF EXISTS user_role CASCADE;
        DROP TYPE IF EXISTS lab_status CASCADE;
    """)
```

---

## MIGRATION 002 — INDEXES + CONSTRAINTS

```python
# migrations/versions/002_indexes_and_constraints.py
"""Indexes and constraints"""
revision = "002"
down_revision = "001"

def upgrade():
    op.execute("""

    -- ── Core lookups ──────────────────────────────────
    CREATE INDEX idx_patients_user      ON patients(user_id);
    CREATE INDEX idx_doctors_user       ON doctors(user_id);
    CREATE INDEX idx_doctors_clinic     ON doctors(clinic_id);
    CREATE INDEX idx_doctors_specialty  ON doctors(specialty);

    -- ── Appointments ──────────────────────────────────
    CREATE INDEX idx_appt_patient       ON appointments(patient_id);
    CREATE INDEX idx_appt_doctor        ON appointments(doctor_id);
    CREATE INDEX idx_appt_slot_time     ON appointments(slot_time DESC);
    CREATE INDEX idx_appt_status        ON appointments(status);
    CREATE INDEX idx_appt_doctor_date   ON appointments(doctor_id, slot_time);
    CREATE INDEX idx_slots_doctor       ON slots(doctor_id);
    CREATE INDEX idx_slots_status       ON slots(status);
    CREATE INDEX idx_slots_start        ON slots(start_time);
    CREATE INDEX idx_waitlist_patient   ON waitlist(patient_id);
    CREATE INDEX idx_waitlist_specialty ON waitlist(specialty);
    CREATE INDEX idx_waitlist_score     ON waitlist(priority_score DESC);
    CREATE INDEX idx_waitlist_active    ON waitlist(is_active) WHERE is_active = TRUE;

    -- ── Clinical ──────────────────────────────────────
    CREATE INDEX idx_prescriptions_patient  ON prescriptions(patient_id);
    CREATE INDEX idx_prescriptions_doctor   ON prescriptions(doctor_id);
    CREATE INDEX idx_prescriptions_appt     ON prescriptions(appointment_id);
    CREATE INDEX idx_lab_orders_patient     ON lab_orders(patient_id);
    CREATE INDEX idx_lab_orders_status      ON lab_orders(status);
    CREATE INDEX idx_clinical_notes_appt    ON clinical_notes(appointment_id);
    CREATE INDEX idx_medical_history_patient ON medical_history(patient_id);

    -- ── SlotSaver (performance critical) ──────────────
    CREATE INDEX idx_risk_scores_appt       ON risk_scores(appointment_id);
    CREATE INDEX idx_risk_scores_score      ON risk_scores(score DESC);
    CREATE INDEX idx_risk_scores_tier       ON risk_scores(tier);
    CREATE INDEX idx_risk_scores_computed   ON risk_scores(computed_at DESC);
    CREATE INDEX idx_recovery_sessions_slot ON recovery_sessions(slot_id);
    CREATE INDEX idx_recovery_outcome       ON recovery_sessions(outcome);
    CREATE INDEX idx_recovery_started       ON recovery_sessions(started_at DESC);
    CREATE INDEX idx_outreach_session       ON outreach_log(session_id);
    CREATE INDEX idx_outreach_patient       ON outreach_log(patient_id);
    CREATE INDEX idx_escalations_session    ON escalations(session_id);
    CREATE INDEX idx_escalations_status     ON escalations(status);
    CREATE INDEX idx_intervention_patient   ON intervention_log(patient_id);
    CREATE INDEX idx_intervention_appt      ON intervention_log(appointment_id);
    CREATE INDEX idx_intervention_outcome   ON intervention_log(outcome);
    CREATE INDEX idx_cancellation_appt      ON cancellation_events(appointment_id);

    -- ── AI / Agents ───────────────────────────────────
    CREATE INDEX idx_agent_runs_session     ON agent_runs(session_id);
    CREATE INDEX idx_agent_runs_agent       ON agent_runs(agent_name);
    CREATE INDEX idx_agent_runs_created     ON agent_runs(created_at DESC);
    CREATE INDEX idx_mcp_calls_agent_run    ON mcp_tool_calls(agent_run_id);
    CREATE INDEX idx_mcp_calls_tool         ON mcp_tool_calls(tool_name);
    CREATE INDEX idx_prompt_versions_agent  ON prompt_versions(agent);
    CREATE INDEX idx_prompt_active          ON prompt_versions(active) WHERE active = TRUE;

    -- ── Notifications ──────────────────────────────────
    CREATE INDEX idx_notifications_user     ON notifications(user_id);
    CREATE INDEX idx_notifications_unread   ON notifications(user_id, is_read) WHERE is_read = FALSE;

    -- ── Audit ─────────────────────────────────────────
    CREATE INDEX idx_audit_user             ON audit_log(user_id);
    CREATE INDEX idx_audit_timestamp        ON audit_log(timestamp DESC);
    CREATE INDEX idx_audit_resource         ON audit_log(resource);

    -- ── Constraints ───────────────────────────────────
    ALTER TABLE slots ADD CONSTRAINT no_slot_overlap
        EXCLUDE USING gist (
            doctor_id WITH =,
            tstzrange(start_time, end_time) WITH &&
        );

    ALTER TABLE risk_scores ADD CONSTRAINT valid_score
        CHECK (score >= 0 AND score <= 1);

    ALTER TABLE outreach_log ADD CONSTRAINT valid_rank
        CHECK (rank >= 1 AND rank <= 10);

    """)
```

---

## MIGRATION 003 — SUPABASE RLS

```python
# migrations/versions/003_rls_policies.py
"""Row Level Security for Supabase"""
revision = "003"
down_revision = "002"

def upgrade():
    op.execute("""

    -- Enable RLS
    ALTER TABLE patients       ENABLE ROW LEVEL SECURITY;
    ALTER TABLE appointments   ENABLE ROW LEVEL SECURITY;
    ALTER TABLE prescriptions  ENABLE ROW LEVEL SECURITY;
    ALTER TABLE lab_orders     ENABLE ROW LEVEL SECURITY;
    ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;

    -- ── Patients: own record only ──────────────────────
    CREATE POLICY patient_select_own ON patients
        FOR SELECT USING (user_id = auth.uid()::text);

    CREATE POLICY doctor_select_patients ON patients
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM users
                WHERE id = auth.uid()::text
                AND role IN ('doctor', 'admin', 'frontdesk')
            )
        );

    -- ── Appointments: patient sees own, doctor sees theirs
    CREATE POLICY patient_own_appointments ON appointments
        FOR SELECT USING (
            patient_id IN (
                SELECT id FROM patients WHERE user_id = auth.uid()::text
            )
        );

    CREATE POLICY doctor_own_appointments ON appointments
        FOR SELECT USING (
            doctor_id IN (
                SELECT id FROM doctors WHERE user_id = auth.uid()::text
            )
        );

    CREATE POLICY admin_all_appointments ON appointments
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM users
                WHERE id = auth.uid()::text AND role = 'admin'
            )
        );

    -- ── Prescriptions: patient sees own, doctor sees theirs
    CREATE POLICY patient_own_prescriptions ON prescriptions
        FOR SELECT USING (
            patient_id IN (
                SELECT id FROM patients WHERE user_id = auth.uid()::text
            )
        );

    CREATE POLICY doctor_own_prescriptions ON prescriptions
        FOR ALL USING (
            doctor_id IN (
                SELECT id FROM doctors WHERE user_id = auth.uid()::text
            )
        );

    -- ── Notifications: own only ────────────────────────
    CREATE POLICY own_notifications ON notifications
        FOR ALL USING (user_id = auth.uid()::text);

    -- ── Clinical notes: doctor only ────────────────────
    CREATE POLICY doctor_clinical_notes ON clinical_notes
        FOR ALL USING (
            doctor_id IN (
                SELECT id FROM doctors WHERE user_id = auth.uid()::text
            )
            OR EXISTS (
                SELECT 1 FROM users
                WHERE id = auth.uid()::text AND role = 'admin'
            )
        );

    """)
```

---

## SEED SCRIPT

```python
# scripts/seed.py
"""
Master seed script.
Run: python -m scripts.seed
Wipes all data. Generates fresh realistic Indian clinic data.
"""

import asyncio
import uuid
import random
from datetime import datetime, timedelta, date
from decimal import Decimal
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.config import settings
from app.database import Base
from scripts.data.indian_names import MALE_NAMES, FEMALE_NAMES, LAST_NAMES
from scripts.data.conditions import MEDICAL_CONDITIONS
from scripts.data.drugs import DRUG_DATABASE
from scripts.data.symptoms import SYMPTOM_SETS

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSession = async_sessionmaker(engine, expire_on_commit=False)

def uid(): return str(uuid.uuid4())
def hash_pw(pw): return pwd_context.hash(pw)
def rand_phone(): return f"+91 {random.randint(70000,99999):05d} {random.randint(10000,99999):05d}"
def rand_date_past(days=365*5): return date.today() - timedelta(days=random.randint(30, days))
def rand_future(days=14): return datetime.now() + timedelta(days=random.randint(1, days), hours=random.randint(0,8))
def rand_past(days=30): return datetime.now() - timedelta(days=random.randint(1, days), hours=random.randint(0,8))


# ── Reference data ────────────────────────────────────

CLINICS = [
    {"id": "CLINIC-001", "name": "City Clinic", "address": "Sector 12, Dwarka, New Delhi", "city": "Delhi"},
    {"id": "CLINIC-002", "name": "Apollo Satellite", "address": "Bandra West, Mumbai", "city": "Mumbai"},
]

DOCTOR_SEED = [
    {"name": "Dr. Rajesh Sharma",  "specialty": "Cardiology",       "qual": "MD, DM Cardiology", "fee": 1500},
    {"name": "Dr. Priya Nair",     "specialty": "Cardiology",       "qual": "MD, DM Cardiology", "fee": 1400},
    {"name": "Dr. Vikram Malhotra","specialty": "Cardiology",       "qual": "MD, DNB Cardiology","fee": 1600},
    {"name": "Dr. Ananya Gupta",   "specialty": "General Medicine", "qual": "MBBS, MD Medicine", "fee": 800},
    {"name": "Dr. Suresh Kumar",   "specialty": "General Medicine", "qual": "MBBS, MD Medicine", "fee": 700},
    {"name": "Dr. Meera Iyer",     "specialty": "Dermatology",      "qual": "MD Dermatology",    "fee": 1200},
    {"name": "Dr. Arun Pillai",    "specialty": "Dermatology",      "qual": "MD Dermatology",    "fee": 1100},
    {"name": "Dr. Sunita Verma",   "specialty": "Orthopaedics",     "qual": "MS Orthopaedics",   "fee": 1800},
    {"name": "Dr. Deepak Joshi",   "specialty": "Orthopaedics",     "qual": "MS Orthopaedics",   "fee": 1700},
    {"name": "Dr. Kavita Reddy",   "specialty": "Psychiatry",       "qual": "MD Psychiatry",     "fee": 1300},
]

SPECIALTIES = list({d["specialty"] for d in DOCTOR_SEED})

NO_SHOW_WEIGHTS = {
    "new_patient":       0.35,
    "lead_time_14plus":  0.25,
    "monday_am":         0.15,
    "friday_pm":         0.12,
    "distance_15plus":   0.20,
    "dermatology":       0.18,
    "psychiatry":        0.22,
    "no_prior_confirm":  0.14,
}


async def seed_all():
    async with AsyncSession() as db:
        print("🌱 Clearing tables...")
        await clear_tables(db)

        print("🏥 Seeding clinics...")
        clinics = await seed_clinics(db)

        print("👨‍⚕️ Seeding doctors...")
        doctors = await seed_doctors(db, clinics)

        print("🙋 Seeding patients...")
        patients = await seed_patients(db, 200)

        print("📅 Seeding slots...")
        slots = await seed_slots(db, doctors)

        print("📋 Seeding appointments...")
        appointments = await seed_appointments(db, patients, doctors, slots)

        print("⏳ Seeding waitlist...")
        await seed_waitlist(db, patients, doctors)

        print("🏥 Seeding clinical data...")
        await seed_clinical(db, appointments, patients, doctors)

        print("🎯 Seeding SlotSaver data...")
        await seed_slotsaver(db, appointments, patients, slots)

        print("🤖 Seeding agent runs...")
        await seed_agent_runs(db)

        print("🔔 Seeding notifications...")
        await seed_notifications(db, patients)

        print("✅ Seed complete.")


async def clear_tables(db):
    tables = [
        "notifications", "audit_log", "ab_test_results", "eval_results",
        "mcp_tool_calls", "agent_runs", "triage_sessions", "scribe_sessions",
        "clinical_notes", "lab_orders", "prescriptions", "allergies",
        "medical_history", "intervention_log", "escalations", "outreach_log",
        "recovery_sessions", "cancellation_events", "risk_scores",
        "waitlist", "appointments", "slots",
        "patients", "doctors", "clinics", "users", "prompt_versions",
    ]
    for table in tables:
        await db.execute(f"TRUNCATE TABLE {table} CASCADE")
    await db.commit()


async def seed_clinics(db):
    for c in CLINICS:
        await db.execute("""
            INSERT INTO clinics (id, name, address, city)
            VALUES (:id, :name, :address, :city)
        """, c)
    await db.commit()
    return CLINICS


async def seed_doctors(db, clinics):
    doctors = []
    for i, d in enumerate(DOCTOR_SEED):
        user_id = uid()
        doc_id = f"D-{i+1:03d}"
        email = f"doctor{i+1}@cureva.health"
        clinic = clinics[i % len(clinics)]

        await db.execute("""
            INSERT INTO users (id, email, hashed_password, role)
            VALUES (:id, :email, :pw, 'doctor')
        """, {"id": user_id, "email": email, "pw": hash_pw("Doctor@123")})

        await db.execute("""
            INSERT INTO doctors
            (id, user_id, clinic_id, name, specialty, qualification,
             registration_no, phone, consultation_fee_inr, rating)
            VALUES
            (:id, :user_id, :clinic_id, :name, :specialty, :qual,
             :reg, :phone, :fee, :rating)
        """, {
            "id": doc_id, "user_id": user_id, "clinic_id": clinic["id"],
            "name": d["name"], "specialty": d["specialty"], "qual": d["qual"],
            "reg": f"MCI/DL/2018/{random.randint(10000,99999)}",
            "phone": rand_phone(), "fee": d["fee"],
            "rating": round(random.uniform(4.2, 4.9), 1),
        })
        doctors.append({"id": doc_id, **d, "clinic_id": clinic["id"]})

    # Seed admin + frontdesk users
    await db.execute("""
        INSERT INTO users (id, email, hashed_password, role)
        VALUES
        (:id1, 'admin@cureva.health', :pw, 'admin'),
        (:id2, 'frontdesk@cureva.health', :pw, 'frontdesk')
    """, {"id1": uid(), "id2": uid(), "pw": hash_pw("Admin@123")})

    await db.commit()
    return doctors


async def seed_patients(db, count=200):
    patients = []
    cities = ["Delhi", "Mumbai", "Bangalore", "Pune", "Chennai"]
    city_clinics = {"Delhi": "CLINIC-001", "Mumbai": "CLINIC-002"}

    for i in range(count):
        gender = random.choice(["M", "F"])
        first = random.choice(MALE_NAMES if gender == "M" else FEMALE_NAMES)
        last = random.choice(LAST_NAMES)
        name = f"{first} {last}"
        city = random.choice(cities)
        user_id = uid()
        pat_id = f"P-{1000+i}"
        email = f"patient{1000+i}@gmail.com"

        await db.execute("""
            INSERT INTO users (id, email, hashed_password, role)
            VALUES (:id, :email, :pw, 'patient')
        """, {"id": user_id, "email": email, "pw": hash_pw("Patient@123")})

        preferences = {
            "preferred_language": random.choice(["english", "hindi", "english"]),
            "preferred_window": random.choice(["morning", "afternoon", "morning"]),
            "preferred_channel": random.choice(["whatsapp", "whatsapp", "sms"]),
            "avoid_days": random.sample([0, 6], k=random.randint(0, 1)),
        }

        await db.execute("""
            INSERT INTO patients
            (id, user_id, name, phone, dob, gender, blood_group,
             address, city, distance_km, preferences)
            VALUES
            (:id, :uid, :name, :phone, :dob, :gender, :bg,
             :addr, :city, :dist, :prefs::jsonb)
        """, {
            "id": pat_id, "uid": user_id, "name": name,
            "phone": rand_phone(),
            "dob": rand_date_past(365 * 60),
            "gender": gender,
            "bg": random.choice(["A+","A-","B+","B-","O+","O-","AB+","AB-"]),
            "addr": f"{random.randint(1,200)}, Sector {random.randint(1,50)}, {city}",
            "city": city,
            "dist": round(random.uniform(0.5, 25.0), 1),
            "prefs": str(preferences).replace("'", '"'),
        })

        # Medical history (0-3 conditions per patient)
        num_conditions = random.choices([0,1,2,3], weights=[0.3,0.4,0.2,0.1])[0]
        for _ in range(num_conditions):
            condition = random.choice(MEDICAL_CONDITIONS)
            await db.execute("""
                INSERT INTO medical_history
                (id, patient_id, condition, diagnosed_at, status)
                VALUES (:id, :pid, :cond, :date, :status)
            """, {
                "id": uid(), "pid": pat_id,
                "cond": condition,
                "date": rand_date_past(365*3),
                "status": random.choice(["active","active","controlled","resolved"]),
            })

        # Allergies (30% of patients)
        if random.random() < 0.3:
            allergen = random.choice(["Penicillin","Sulfa drugs","Aspirin","NSAIDs","Iodine","Latex"])
            await db.execute("""
                INSERT INTO allergies (id, patient_id, allergen, severity, reaction)
                VALUES (:id, :pid, :al, :sev, :rx)
            """, {
                "id": uid(), "pid": pat_id, "al": allergen,
                "sev": random.choice(["mild","moderate","severe"]),
                "rx": random.choice(["Rash","Hives","Anaphylaxis","Swelling"]),
            })

        patients.append({"id": pat_id, "name": name, "city": city,
                          "distance_km": round(random.uniform(0.5, 25.0), 1)})

    await db.commit()
    return patients


async def seed_slots(db, doctors, days_ahead=14):
    slots = []
    for doc in doctors:
        for day_offset in range(days_ahead):
            slot_date = date.today() + timedelta(days=day_offset)
            if slot_date.weekday() == 6:  # Skip Sunday
                continue

            # Morning: 9am–1pm, Afternoon: 2pm–6pm
            times = []
            t = 9
            while t < 13:
                times.append(t)
                t += 0.5
            t = 14
            while t < 18:
                times.append(t)
                t += 0.5

            for t in times:
                hour = int(t)
                minute = 30 if t % 1 else 0
                start = datetime(slot_date.year, slot_date.month, slot_date.day, hour, minute)
                end = start + timedelta(minutes=30)
                slot_id = uid()
                await db.execute("""
                    INSERT INTO slots (id, doctor_id, start_time, end_time, status)
                    VALUES (:id, :doc, :start, :end, 'available')
                """, {"id": slot_id, "doc": doc["id"], "start": start, "end": end})
                slots.append({"id": slot_id, "doctor_id": doc["id"],
                               "start_time": start, "specialty": doc["specialty"]})

    await db.commit()
    return slots


async def seed_appointments(db, patients, doctors, slots, count=500):
    appointments = []
    available_slots = [s for s in slots if s["start_time"] > datetime.now()]

    statuses = ["scheduled","scheduled","confirmed","confirmed",
                "completed","completed","completed","cancelled","no_show"]

    for i in range(min(count, len(available_slots))):
        slot = available_slots[i]
        patient = random.choice(patients)
        doctor = next(d for d in doctors if d["id"] == slot["doctor_id"])

        status = random.choice(statuses)
        appt_id = f"A-{8000+i}"
        lead_time = random.randint(1, 30)
        is_new = random.random() < 0.25

        await db.execute("""
            INSERT INTO appointments
            (id, patient_id, doctor_id, slot_id, slot_time, status,
             specialty, value_inr, reason, is_new_patient,
             is_follow_up, lead_time_days)
            VALUES
            (:id, :pid, :did, :sid, :stime, :status,
             :spec, :fee, :reason, :new_p, :followup, :lead)
        """, {
            "id": appt_id,
            "pid": patient["id"],
            "did": doctor["id"],
            "sid": slot["id"],
            "stime": slot["start_time"],
            "status": status,
            "spec": doctor["specialty"],
            "fee": doctor["fee"],
            "reason": random.choice(SYMPTOM_SETS.get(doctor["specialty"], ["General consultation"])),
            "new_p": is_new,
            "followup": not is_new and random.random() < 0.4,
            "lead": lead_time,
        })

        if status == "cancelled":
            await db.execute("""
                INSERT INTO cancellation_events
                (id, appointment_id, slot_id, cancelled_by, reason)
                VALUES (:id, :aid, :sid, :by, :reason)
            """, {
                "id": uid(), "aid": appt_id, "sid": slot["id"],
                "by": random.choice(["patient","frontdesk"]),
                "reason": random.choice(["personal","rescheduled","emergency",""]),
            })

        appointments.append({
            "id": appt_id, "patient_id": patient["id"],
            "doctor_id": doctor["id"], "specialty": doctor["specialty"],
            "slot_time": slot["start_time"], "status": status,
            "value_inr": doctor["fee"], "is_new_patient": is_new,
        })

    await db.commit()
    return appointments


async def seed_waitlist(db, patients, doctors):
    for _ in range(180):
        patient = random.choice(patients)
        doctor = random.choice(doctors)
        wait_days = random.randint(1, 30)
        score = (
            min(wait_days / 30, 1) * 0.30 +
            random.uniform(0.1, 1.0) * 0.25 +   # urgency
            (1 - min(patient["distance_km"] / 25, 1)) * 0.20 +
            random.uniform(0.1, 1.0) * 0.15 +   # acceptance prob
            1.0 * 0.10                            # specialty match
        )
        await db.execute("""
            INSERT INTO waitlist
            (id, patient_id, specialty, doctor_id, priority_score, wait_days, urgency)
            VALUES (:id, :pid, :spec, :did, :score, :days, :urg)
        """, {
            "id": uid(),
            "pid": patient["id"],
            "spec": doctor["specialty"],
            "did": doctor["id"],
            "score": round(score, 3),
            "days": wait_days,
            "urg": random.choice(["low","medium","high"]),
        })
    await db.commit()


async def seed_clinical(db, appointments, patients, doctors):
    completed = [a for a in appointments if a["status"] == "completed"]

    for appt in completed:
        # Prescription
        drug1, drug2 = random.sample(DRUG_DATABASE, 2)
        rx_id = uid()
        await db.execute("""
            INSERT INTO prescriptions
            (id, appointment_id, patient_id, doctor_id, diagnosis,
             medicines, tests_ordered, instructions, follow_up_date)
            VALUES
            (:id, :aid, :pid, :did, :diag,
             :meds::jsonb, :tests::jsonb, :instr, :fu)
        """, {
            "id": rx_id, "aid": appt["id"],
            "pid": appt["patient_id"], "did": appt["doctor_id"],
            "diag": random.choice(MEDICAL_CONDITIONS),
            "meds": str([
                {"name": drug1["name"], "strength": random.choice(drug1["strengths"]),
                 "dosage": drug1["common_dosage"], "duration_days": 30,
                 "instructions": drug1["instructions"]},
                {"name": drug2["name"], "strength": random.choice(drug2["strengths"]),
                 "dosage": drug2["common_dosage"], "duration_days": 30,
                 "instructions": drug2["instructions"]},
            ]).replace("'", '"'),
            "tests": str(random.sample(
                ["CBC","Lipid Panel","HbA1c","Blood Sugar (F)","LFT","KFT","TSH","Urine R/M"],
                k=random.randint(1, 3)
            )).replace("'", '"'),
            "instr": random.choice([
                "Low sodium diet. Walk 30 min daily.",
                "Avoid spicy food. Rest adequately.",
                "Stay hydrated. Avoid alcohol.",
                "Take medicines with food.",
            ]),
            "fu": date.today() + timedelta(days=random.randint(14, 60)),
        })

        # Clinical note
        await db.execute("""
            INSERT INTO clinical_notes
            (id, appointment_id, doctor_id, subjective, objective,
             assessment, plan)
            VALUES (:id, :aid, :did, :subj, :obj::jsonb, :assess, :plan)
        """, {
            "id": uid(), "aid": appt["id"], "did": appt["doctor_id"],
            "subj": random.choice([
                "Patient reports improvement since last visit.",
                "Chief complaint: fatigue and headaches for 2 weeks.",
                "Follow-up for hypertension management.",
                "New patient with complaints of knee pain.",
            ]),
            "obj": '{"bp": "' + f"{random.randint(110,150)}/{random.randint(70,95)}" + '", "weight": ' + str(random.randint(55,90)) + ', "heart_rate": ' + str(random.randint(62,90)) + '}',
            "assess": random.choice(MEDICAL_CONDITIONS),
            "plan": "Continue current medications. Lifestyle modifications advised. Follow-up in 30 days.",
        })

    await db.commit()


async def seed_slotsaver(db, appointments, patients, slots):
    # Risk scores for upcoming appointments
    upcoming = [a for a in appointments if a["status"] in ("scheduled","confirmed")]
    for appt in upcoming[:200]:
        patient_dist = random.uniform(0.5, 25.0)
        factors = []
        score = 0.0

        if appt["is_new_patient"]:
            score += 0.30; factors.append("New patient (first visit)")
        if appt.get("lead_time_days", 0) > 14:
            score += 0.20; factors.append(f"Booked {appt.get('lead_time_days',0)} days ago")
        if patient_dist > 15:
            score += 0.15; factors.append(f"Distance: {patient_dist:.1f}km")
        if appt["specialty"] in ("Dermatology","Psychiatry"):
            score += 0.12; factors.append(f"{appt['specialty']} (higher no-show rate)")
        score += random.uniform(0, 0.30)
        score = min(score, 0.99)

        tier = ("low" if score < 0.4 else
                "medium" if score < 0.65 else
                "high" if score < 0.85 else "critical")

        channel = ("sms" if score < 0.4 else
                   "whatsapp" if score < 0.65 else "voice_call")

        await db.execute("""
            INSERT INTO risk_scores
            (id, appointment_id, patient_id, score, tier,
             top_factors, planned_intervention)
            VALUES (:id, :aid, :pid, :score, :tier, :factors::jsonb, :channel)
        """, {
            "id": uid(), "aid": appt["id"], "pid": appt["patient_id"],
            "score": round(score, 3), "tier": tier,
            "factors": str(factors[:3]).replace("'", '"'),
            "channel": channel,
        })

    # Recovery sessions (30 days history)
    cancelled_slots = [s for s in slots if s["start_time"] < datetime.now()]
    outcomes = ["recovered","recovered","recovered","escalated","lost"]

    for i in range(50):
        slot = random.choice(cancelled_slots)
        outcome = random.choice(outcomes)
        started = rand_past(30)
        fill_time = random.randint(180, 900) if outcome == "recovered" else None

        sess_id = uid()
        await db.execute("""
            INSERT INTO recovery_sessions
            (id, slot_id, started_at, closed_at, outcome,
             fill_time_seconds, revenue_inr, patients_contacted)
            VALUES (:id, :sid, :start, :closed, :outcome,
                    :fill, :rev, :contacted)
        """, {
            "id": sess_id, "sid": slot["id"],
            "start": started,
            "closed": started + timedelta(seconds=fill_time or 900),
            "outcome": outcome,
            "fill": fill_time,
            "rev": random.randint(800, 2000) if outcome == "recovered" else 0,
            "contacted": random.randint(1, 3),
        })

        # Outreach log for session
        session_patients = random.sample(patients, min(3, len(patients)))
        for rank, pat in enumerate(session_patients, 1):
            response = None
            if outcome == "recovered" and rank == 1:
                response = "YES"
            elif outcome == "escalated":
                response = None
            else:
                response = random.choice([None, "NO", None])

            await db.execute("""
                INSERT INTO outreach_log
                (id, session_id, patient_id, rank, score, message,
                 channel, response, outcome)
                VALUES
                (:id, :sid, :pid, :rank, :score, :msg, :ch, :resp, :out)
            """, {
                "id": uid(), "sid": sess_id, "pid": pat["id"],
                "rank": rank, "score": round(random.uniform(0.4, 0.95), 3),
                "msg": f"Hi {pat['name'].split()[0]}, a slot is available. Reply YES to confirm.",
                "ch": random.choice(["whatsapp","sms","voice_call"]),
                "resp": response,
                "out": "confirmed" if response == "YES" else ("declined" if response == "NO" else "no_response"),
            })

        # Escalation for escalated/lost
        if outcome in ("escalated", "lost"):
            await db.execute("""
                INSERT INTO escalations
                (id, session_id, reason, payload, status)
                VALUES (:id, :sid, :reason, :payload::jsonb, :status)
            """, {
                "id": uid(), "sid": sess_id,
                "reason": "no_response_timeout",
                "payload": '{"patients_contacted": 3, "responses_received": 0}',
                "status": random.choice(["open","resolved","resolved"]),
            })

    await db.commit()


async def seed_agent_runs(db):
    agents = ["predictor","intervention","recovery","triage","scribe","prescription","escalation","audit"]
    for _ in range(1000):
        agent = random.choice(agents)
        latency = random.randint(200, 8000)
        await db.execute("""
            INSERT INTO agent_runs
            (id, session_id, agent_name, tokens_used, latency_ms, success)
            VALUES (:id, :sid, :agent, :tokens, :lat, :ok)
        """, {
            "id": uid(),
            "sid": uid(),
            "agent": agent,
            "tokens": random.randint(500, 50000),
            "lat": latency,
            "ok": random.random() > 0.02,
        })
    await db.commit()


async def seed_notifications(db, patients):
    types = ["slot_recovered","risk_flagged","appointment_confirmed",
             "prescription_ready","escalation_needed"]
    for _ in range(300):
        patient = random.choice(patients)
        n_type = random.choice(types)
        await db.execute("""
            INSERT INTO notifications
            (id, patient_id, type, title, body, is_read)
            VALUES (:id, :pid, :type, :title, :body, :read)
        """, {
            "id": uid(), "pid": patient["id"], "type": n_type,
            "title": {
                "slot_recovered": "Slot recovered",
                "risk_flagged": "Appointment reminder",
                "appointment_confirmed": "Appointment confirmed",
                "prescription_ready": "Prescription ready",
                "escalation_needed": "Action required",
            }[n_type],
            "body": "See Cureva for details.",
            "read": random.random() > 0.4,
        })
    await db.commit()


if __name__ == "__main__":
    asyncio.run(seed_all())
```

---

## REFERENCE DATA FILES

```python
# scripts/data/indian_names.py
MALE_NAMES = [
    "Aarav","Arjun","Vikram","Rahul","Rohit","Karan","Amit","Suresh",
    "Deepak","Rajesh","Manish","Sanjay","Nikhil","Vivek","Aditya",
    "Kunal","Gaurav","Pradeep","Varun","Ankit","Ravi","Santosh",
]
FEMALE_NAMES = [
    "Priya","Ananya","Neha","Kavita","Sunita","Meera","Pooja","Divya",
    "Anjali","Ritika","Shreya","Nisha","Pallavi","Swati","Rekha",
    "Madhuri","Geeta","Sonal","Radhika","Preeti","Asha","Usha",
]
LAST_NAMES = [
    "Sharma","Gupta","Singh","Kumar","Verma","Mehta","Patel","Nair",
    "Iyer","Reddy","Joshi","Malhotra","Kapoor","Bose","Das","Rao",
    "Pillai","Menon","Agarwal","Bansal","Mishra","Sinha","Pandey",
]
```

```python
# scripts/data/conditions.py
MEDICAL_CONDITIONS = [
    "Hypertension Stage 1","Hypertension Stage 2","Hyperlipidemia",
    "Type 2 Diabetes","Pre-diabetes","Hypothyroidism","Hyperthyroidism",
    "Coronary Artery Disease","Atrial Fibrillation","Heart Failure",
    "Osteoarthritis — Knee","Lumbar Spondylosis","Cervical Spondylosis",
    "Rotator Cuff Tear","Plantar Fasciitis",
    "Acne Vulgaris","Psoriasis","Atopic Dermatitis","Urticaria","Rosacea",
    "Generalized Anxiety Disorder","Major Depressive Disorder","Insomnia",
    "Upper Respiratory Infection","GERD","IBS","Anaemia",
]
```

```python
# scripts/data/drugs.py
DRUG_DATABASE = [
    {"name":"Atorvastatin","strengths":["5mg","10mg","20mg","40mg"],
     "common_dosage":"1-0-1","instructions":"Take after dinner. Avoid grapefruit."},
    {"name":"Aspirin","strengths":["75mg","150mg","325mg"],
     "common_dosage":"1-0-0","instructions":"Take with food. Do not crush."},
    {"name":"Metformin","strengths":["500mg","850mg","1000mg"],
     "common_dosage":"1-0-1","instructions":"Take with meals."},
    {"name":"Amlodipine","strengths":["2.5mg","5mg","10mg"],
     "common_dosage":"0-0-1","instructions":"Take at bedtime."},
    {"name":"Losartan","strengths":["25mg","50mg","100mg"],
     "common_dosage":"1-0-0","instructions":"Take at the same time daily."},
    {"name":"Levothyroxine","strengths":["25mcg","50mcg","75mcg","100mcg"],
     "common_dosage":"1-0-0","instructions":"Take 30 min before breakfast."},
    {"name":"Pantoprazole","strengths":["20mg","40mg"],
     "common_dosage":"1-0-0","instructions":"Take 30 min before breakfast."},
    {"name":"Cetirizine","strengths":["5mg","10mg"],
     "common_dosage":"0-0-1","instructions":"May cause drowsiness."},
    {"name":"Amoxicillin","strengths":["250mg","500mg"],
     "common_dosage":"1-1-1","instructions":"Complete full course."},
    {"name":"Paracetamol","strengths":["325mg","500mg","650mg"],
     "common_dosage":"1-1-1","instructions":"Do not exceed 4g/day."},
]
```

```python
# scripts/data/symptoms.py
SYMPTOM_SETS = {
    "Cardiology":       ["Chest pain","Shortness of breath","Palpitations",
                         "Hypertension follow-up","Dizziness","Ankle swelling"],
    "General Medicine": ["Fever","Cough and cold","Fatigue","Headache",
                         "Abdominal pain","General checkup","Weakness"],
    "Dermatology":      ["Skin rash","Acne","Hair fall","Itching",
                         "Dark spots","Dry skin","Nail infection"],
    "Orthopaedics":     ["Knee pain","Back pain","Shoulder pain",
                         "Joint stiffness","Fracture follow-up","Neck pain"],
    "Psychiatry":       ["Anxiety","Depression","Sleep issues","Stress",
                         "Mood swings","Panic attacks","Follow-up"],
}
```

---

## RUN COMMANDS

```bash
# First time setup
alembic upgrade head

# Seed (wipes + regenerates)
python -m scripts.seed

# Verify counts
python - <<'EOF'
import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as db:
        for table in ["users","patients","doctors","appointments","slots",
                      "prescriptions","risk_scores","recovery_sessions"]:
            result = await db.execute(text(f"SELECT COUNT(*) FROM {table}"))
            print(f"{table}: {result.scalar()}")

asyncio.run(check())
EOF
```

---

## RULES

```
1. All IDs VARCHAR(36) — never SERIAL/INTEGER
2. All timestamps TIMESTAMPTZ — never TIMESTAMP without timezone
3. JSONB for all structured nested data — never TEXT JSON
4. Seed names use Indian names list — never Lorem/John/Jane
5. Risk scores must have realistic distribution:
   Low 60%, Medium 22%, High 13%, Critical 5%
6. Completed appointments MUST have prescriptions + clinical notes
7. Cancelled appointments MUST have cancellation_events row
8. Recovery sessions MUST have outreach_log rows (1-3 per session)
9. Escalated/lost sessions MUST have escalations row
10. Field names match frontend mock data exactly — zero rename at connect time
```
