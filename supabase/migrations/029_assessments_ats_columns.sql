-- Basanite: assessments — ATS provenance + invite tokens
--
-- Two new use cases land in the assessments table here:
--
-- 1. Assessments created from an ATS webhook need to remember WHICH ATS
--    application they came from so PR7 can push results back to the same
--    application via Merge. We store `merge_application_id` and (for direct
--    deep-links from our dashboard back into the customer's ATS) the
--    provider-native `remote_application_id`.
--
-- 2. ATS-sourced assessments are pre-created with the candidate's CV already
--    pulled from the ATS attachment. The candidate gets an email with a
--    unique `invite_token` link rather than the shared role-link; the invite
--    flow skips the CV upload step entirely (PR6).
--
-- `source` lets us distinguish "candidate self-served via role link" from
-- "ATS auto-invited" in the dashboard queue and analytics.

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS source TEXT
  DEFAULT 'self_serve'
  CHECK (source IN ('self_serve', 'ats'));

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS connection_id UUID
  REFERENCES ats_connections(id) ON DELETE SET NULL;

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS merge_application_id TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS merge_candidate_id TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS remote_application_id TEXT;

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS invite_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_assessments_invite_token
  ON assessments(invite_token) WHERE invite_token IS NOT NULL;

-- Idempotency: an ATS webhook firing twice for the same application must
-- update the existing assessment, not create a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS uq_assessments_merge_application
  ON assessments(merge_application_id) WHERE merge_application_id IS NOT NULL;

-- Outbound push state — null until PR7 attempts a push. last_push_status
-- lets the dashboard surface "score posted to Greenhouse" or "push failed,
-- retry queued".
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS last_push_status TEXT
  CHECK (last_push_status IN ('pending', 'success', 'failed') OR last_push_status IS NULL);
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS last_push_at TIMESTAMPTZ;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS last_push_error TEXT;
