-- Candidate-reported issues from inside the interview.
--
-- A "Having issues?" control in the live interview lets a candidate flag a
-- problem (no audio, interviewer not responding, page frozen, …) without
-- abandoning the session. Reports land here and surface on the admin
-- dashboard so the team can react while the candidate is still in the funnel.
--
-- assessment_id is nullable + ON DELETE SET NULL: a report should survive the
-- assessment being erased (DSAR) and should still be writable in the rare case
-- the candidate's assessment row can't be resolved client-side. `token` keeps
-- the assessment link for context even when assessment_id is null.

CREATE TABLE IF NOT EXISTS issue_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
  token         TEXT,
  category      TEXT NOT NULL,
  message       TEXT NOT NULL DEFAULT '',
  page          TEXT,
  user_agent    TEXT,
  status        TEXT NOT NULL DEFAULT 'new',   -- 'new' | 'resolved'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin dashboard lists newest first and filters open reports.
CREATE INDEX IF NOT EXISTS idx_issue_reports_created_at ON issue_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issue_reports_status ON issue_reports(status);
CREATE INDEX IF NOT EXISTS idx_issue_reports_assessment_id ON issue_reports(assessment_id);

-- Reads and writes go exclusively through the service-role client (the
-- candidate write route and the admin read route both use it). Enable RLS
-- with no anon/authenticated policies so a leaked anon key can neither read
-- other candidates' reports nor forge rows; the service role bypasses RLS.
ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;
