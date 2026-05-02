-- Basanite — GDPR compliance scaffolding.
--
-- Three concerns this migration covers:
--
--   1. consent_records: every explicit consent grant or withdrawal is logged
--      with timestamp, policy version, masked IP, and user-agent so we can
--      prove (Article 7) what a data subject agreed to and when.
--
--   2. dsar_requests: data-subject access requests (Article 15-22 rights —
--      export, erasure, rectification, objection, restriction) need an audit
--      trail. We mint a verification token on submission, email it, and only
--      action the request once the email is confirmed.
--
--   3. data_retention_runs: log every automated cleanup pass so we can
--      demonstrate the retention policy is actually being enforced.
--
-- Plus two row-level toggles on the assessments table:
--   - object_to_automated_decisions: Article 22 opt-out. When TRUE, the hirer
--     must manually review the candidate before acting on any score.
--   - deletion_requested_at: marks an assessment for soft-deletion; the
--     retention sweep finalises and purges.

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
  -- e.g. 'recording', 'ai_scoring', 'cv_processing', 'marketing_email', 'over_16'
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  policy_version TEXT,
  user_agent TEXT,
  -- Best-effort masked IP for evidentiary value (last octet zeroed).
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_assessment_id ON consent_records(assessment_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_type ON consent_records(consent_type);
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_records_self_select" ON consent_records FOR SELECT
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dsar_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'erasure', 'rectification', 'objection', 'restriction')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'completed', 'rejected', 'expired')),
  verification_token TEXT UNIQUE,
  verification_expires_at TIMESTAMPTZ,
  details JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsar_requests_email ON dsar_requests(email);
CREATE INDEX IF NOT EXISTS idx_dsar_requests_token ON dsar_requests(verification_token);
ALTER TABLE dsar_requests ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_retention_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_assessments INT NOT NULL DEFAULT 0,
  deleted_recordings INT NOT NULL DEFAULT 0,
  deleted_transcripts INT NOT NULL DEFAULT 0,
  deleted_reports INT NOT NULL DEFAULT 0,
  deleted_dimension_scores INT NOT NULL DEFAULT 0,
  deleted_waitlist INT NOT NULL DEFAULT 0,
  errors JSONB
);
ALTER TABLE data_retention_runs ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS object_to_automated_decisions BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

-- Optional company info for hirer org (controller-of-record per Article 30).
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS controller_address TEXT;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS controller_email TEXT;
