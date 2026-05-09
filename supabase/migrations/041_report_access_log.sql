-- ENG-42: audit trail for hirer (and signed-URL) access to candidate
-- reports. Two reasons:
--
--   1. GDPR Article 15(1)(c) — when a candidate exercises their right
--      to access, they should be able to see who has viewed their
--      assessment report. The DSAR export now includes this list.
--   2. Insider-threat detection — without it, a recruiter exporting
--      every candidate report before resigning is undetectable.
--
-- Every read of a candidate's report (hirer dashboard, candidate self-
-- view, signed public URL) inserts a row here. Service-role writes are
-- the only path; candidates can SELECT their own trail and hirers can
-- SELECT the trail for their org's assessments.

CREATE TABLE IF NOT EXISTS report_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  accessed_by UUID REFERENCES auth.users(id),  -- NULL for signed-URL access
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  report_type TEXT NOT NULL CHECK (report_type IN ('hirer', 'candidate')),
  access_kind TEXT NOT NULL CHECK (access_kind IN (
    'hirer-dashboard',
    'candidate-self',
    'public-signed-url'
  )),
  ip_hash TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_report_access_log_assessment
  ON report_access_log(assessment_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_access_log_accessed_by
  ON report_access_log(accessed_by, accessed_at DESC)
  WHERE accessed_by IS NOT NULL;

ALTER TABLE report_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_access_log FORCE ROW LEVEL SECURITY;

-- Candidates see their own audit trail (powers DSAR self-service).
CREATE POLICY "report_access_log_candidate_self_select"
  ON report_access_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM assessments
    WHERE assessments.id = report_access_log.assessment_id
      AND assessments.candidate_user_id = auth.uid()
  ));

-- Hirers see the trail for assessments in their org's roles. Mirrors
-- the assessments_hirer_select policy from migration 026; legacy
-- single-user roles (org_id IS NULL) are also covered.
CREATE POLICY "report_access_log_hirer_select"
  ON report_access_log FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM assessments
    JOIN roles ON roles.id = assessments.role_id
    WHERE assessments.id = report_access_log.assessment_id
      AND (
        (roles.org_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM org_members
          WHERE org_members.org_id = roles.org_id
            AND org_members.user_id = auth.uid()
        ))
        OR (roles.org_id IS NULL AND roles.user_id = auth.uid())
      )
  ));

-- No INSERT/UPDATE/DELETE policies. Service-role on the API tier is
-- the only writer; FORCE RLS above keeps an authenticated bypass from
-- working even if someone swapped the client by mistake.
