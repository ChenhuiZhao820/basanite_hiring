-- Test Mode: internal testers walk the full candidate journey (link →
-- CV upload → onboarding → mic check → live interview → completion)
-- against a designated test role. Their sessions are stamped is_mock at
-- /start (server-side only, gated by TEST_MODE_ENABLED +
-- TEST_MODE_ROLE_ID in the API environment) and read everywhere else:
-- the agent makes small talk instead of interviewing, no reports or
-- dimension_scores are written, and the dashboard pins the row to the
-- bottom of the queue with a TEST badge.
--
-- is_mock is server-written only. Migration 039 already dropped the
-- candidate INSERT/UPDATE policies on assessments and forced RLS, so
-- candidates cannot set this column via PostgREST; every write path
-- goes through FastAPI with the service role.

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS is_mock BOOLEAN NOT NULL DEFAULT false;

-- Cheap filter for per-role aggregates that exclude test rows.
CREATE INDEX IF NOT EXISTS idx_assessments_role_is_mock
  ON assessments(role_id, is_mock);
