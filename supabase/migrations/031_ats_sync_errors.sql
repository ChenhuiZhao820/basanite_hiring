-- Basanite: ats_sync_errors
--
-- Every external write (PR7's push_results) and external read (webhook intake
-- pulling CV attachments) that fails lands here, keyed by org. The dashboard
-- can surface "ATS sync had 2 failures in the last 24h" so customers don't
-- silently lose data, and we email the founder on first occurrence.
--
-- This is intentionally a separate table from ats_webhook_events: that one
-- tracks idempotency of inbound deliveries, this one tracks ANY ATS-touching
-- failure (inbound CV fetch, outbound results push, scorecard write, etc.).

CREATE TABLE ats_sync_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES ats_connections(id) ON DELETE SET NULL,
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  -- e.g. 'webhook.application.created', 'push_results', 'scorecard.write',
  -- 'cv_fetch'. Free-form so we can grep without schema migrations.
  operation TEXT NOT NULL,
  error_class TEXT,          -- exception class name
  error_message TEXT,        -- truncated to 1000 chars in code
  context JSONB,             -- merge_application_id, merge_candidate_id, etc.
  resolved_at TIMESTAMPTZ,   -- ops can mark as resolved once root-caused
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ats_sync_errors_org_id ON ats_sync_errors(org_id);
CREATE INDEX idx_ats_sync_errors_created_at ON ats_sync_errors(created_at DESC);
CREATE INDEX idx_ats_sync_errors_unresolved
  ON ats_sync_errors(created_at DESC) WHERE resolved_at IS NULL;

ALTER TABLE ats_sync_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ats_sync_errors_org_members_select" ON ats_sync_errors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = ats_sync_errors.org_id
        AND org_members.user_id = auth.uid()
    )
  );
