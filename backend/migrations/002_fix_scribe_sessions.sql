-- Migration: 002_fix_scribe_sessions.sql
-- Purpose: align scribe_sessions with the columns the scribe agent and clinical
--          controller actually write to.
-- Background: backend/schema.sql defines scribe_sessions with `transcript` (TEXT)
--             and no soap_note column. agents/nodes.ts (scribe node) and
--             backend/app/domains/clinical/clinical.controller.ts both write
--             to `full_transcript` and `soap_note` (JSONB). Inserts silently
--             fail or the agent crashes.
--
-- Apply via Supabase SQL editor or:
--   psql "$DATABASE_URL" -f backend/migrations/002_fix_scribe_sessions.sql

BEGIN;

-- Add the columns the agents / controllers actually use.
ALTER TABLE scribe_sessions
  ADD COLUMN IF NOT EXISTS full_transcript TEXT DEFAULT '';

ALTER TABLE scribe_sessions
  ADD COLUMN IF NOT EXISTS soap_note JSONB DEFAULT '{}'::jsonb;

ALTER TABLE scribe_sessions
  ADD COLUMN IF NOT EXISTS doctor_id VARCHAR(36) REFERENCES doctors(id);

-- Backfill: keep any existing `transcript` content visible to the scribe node.
UPDATE scribe_sessions
   SET full_transcript = transcript
 WHERE full_transcript = ''
   AND transcript IS NOT NULL
   AND transcript <> '';

-- Helpful index for the doctor dashboard lookups.
CREATE INDEX IF NOT EXISTS idx_scribe_sessions_doctor
  ON scribe_sessions(doctor_id);

CREATE INDEX IF NOT EXISTS idx_scribe_sessions_appointment
  ON scribe_sessions(appointment_id);

COMMIT;

-- Verification query (run after applying):
--   SELECT column_name, data_type
--     FROM information_schema.columns
--    WHERE table_name = 'scribe_sessions'
--    ORDER BY ordinal_position;
