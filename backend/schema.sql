-- Enable the pgvector extension for RAG
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable uuid-ossp for uuid generation if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    status         lab_status DEFAULT 'ordered',
    results        JSONB DEFAULT '[]'::jsonb,
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
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scribe_sessions (
    id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    appointment_id  VARCHAR(36) NOT NULL REFERENCES appointments(id),
    doctor_id       VARCHAR(36) REFERENCES doctors(id),
    audio_url       VARCHAR(500) DEFAULT '',
    transcript      TEXT DEFAULT '',
    full_transcript TEXT DEFAULT '',
    soap_note       JSONB DEFAULT '{}'::jsonb,
    status          VARCHAR(20) DEFAULT 'active',
    word_count      INTEGER DEFAULT 0,
    duration_sec    INTEGER DEFAULT 0,
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    ended_at        TIMESTAMPTZ
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
);

CREATE TABLE escalations (
    id           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    session_id   VARCHAR(36) NOT NULL REFERENCES recovery_sessions(id),
    reason       VARCHAR(50) NOT NULL,
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

-- ════════════════════════════════════════════
-- RAG CLINICAL KNOWLEDGE
-- ════════════════════════════════════════════

CREATE TABLE documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text        TEXT NOT NULL,
    source      VARCHAR(100) NOT NULL,
    category    VARCHAR(50) NOT NULL,
    embedding   vector(768) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════
-- INDEXES & CONSTRAINTS (Migration 002)
-- ════════════════════════════════════════════

CREATE INDEX idx_patients_user      ON patients(user_id);
CREATE INDEX idx_doctors_user       ON doctors(user_id);
CREATE INDEX idx_doctors_clinic     ON doctors(clinic_id);
CREATE INDEX idx_doctors_specialty  ON doctors(specialty);

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

CREATE INDEX idx_prescriptions_patient   ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor    ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_appt      ON prescriptions(appointment_id);
CREATE INDEX idx_lab_orders_patient      ON lab_orders(patient_id);
CREATE INDEX idx_lab_orders_status       ON lab_orders(status);
CREATE INDEX idx_clinical_notes_appt     ON clinical_notes(appointment_id);
CREATE INDEX idx_medical_history_patient  ON medical_history(patient_id);
CREATE INDEX idx_scribe_sessions_appt    ON scribe_sessions(appointment_id);
CREATE INDEX idx_scribe_sessions_doctor  ON scribe_sessions(doctor_id);

CREATE INDEX idx_risk_scores_appt        ON risk_scores(appointment_id);
CREATE INDEX idx_risk_scores_score       ON risk_scores(score DESC);
CREATE INDEX idx_risk_scores_tier        ON risk_scores(tier);
CREATE INDEX idx_risk_scores_computed    ON risk_scores(computed_at DESC);
CREATE INDEX idx_recovery_sessions_slot  ON recovery_sessions(slot_id);
CREATE INDEX idx_recovery_outcome        ON recovery_sessions(outcome);
CREATE INDEX idx_recovery_started        ON recovery_sessions(started_at DESC);
CREATE INDEX idx_outreach_session        ON outreach_log(session_id);
CREATE INDEX idx_outreach_patient        ON outreach_log(patient_id);
CREATE INDEX idx_escalations_session     ON escalations(session_id);
CREATE INDEX idx_escalations_status      ON escalations(status);
CREATE INDEX idx_intervention_patient    ON intervention_log(patient_id);
CREATE INDEX idx_intervention_appt       ON intervention_log(appointment_id);
CREATE INDEX idx_intervention_outcome    ON intervention_log(outcome);
CREATE INDEX idx_cancellation_appt       ON cancellation_events(appointment_id);

CREATE INDEX idx_agent_runs_session      ON agent_runs(session_id);
CREATE INDEX idx_agent_runs_agent        ON agent_runs(agent_name);
CREATE INDEX idx_agent_runs_created      ON agent_runs(created_at DESC);
CREATE INDEX idx_mcp_calls_agent_run     ON mcp_tool_calls(agent_run_id);
CREATE INDEX idx_mcp_calls_tool          ON mcp_tool_calls(tool_name);
CREATE INDEX idx_prompt_versions_agent   ON prompt_versions(agent);
CREATE INDEX idx_prompt_active           ON prompt_versions(active) WHERE active = TRUE;

CREATE INDEX idx_notifications_user      ON notifications(user_id);
CREATE INDEX idx_notifications_unread    ON notifications(user_id, is_read) WHERE is_read = FALSE;

CREATE INDEX idx_audit_user              ON audit_log(user_id);
CREATE INDEX idx_audit_timestamp         ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_resource          ON audit_log(resource);

-- RAG vector search index
CREATE INDEX idx_documents_category     ON documents(category);
CREATE INDEX idx_documents_source       ON documents(source);

ALTER TABLE risk_scores ADD CONSTRAINT valid_score
    CHECK (score >= 0 AND score <= 1);

ALTER TABLE outreach_log ADD CONSTRAINT valid_rank
    CHECK (rank >= 1 AND rank <= 10);

-- ════════════════════════════════════════════
-- VECTOR MATCH FUNCTION (RPC)
-- ════════════════════════════════════════════

CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  category_filter varchar DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  text text,
  source varchar,
  category varchar,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.text,
    d.source,
    d.category,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE (category_filter IS NULL OR d.category = category_filter)
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
