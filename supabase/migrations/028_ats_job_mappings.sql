-- Basanite: ats_job_mappings
--
-- Maps a job in the customer's ATS (identified by its Merge job-id, which is
-- stable per linked-account) to a Basanite role. When a webhook fires for an
-- application created against that ATS job, we look up this table to find
-- which Basanite role the candidate should be assessed against.
--
-- One ATS job → one Basanite role (v1). A Basanite role can be the target of
-- multiple ATS jobs (e.g. a hirer runs the same role on Greenhouse and Lever
-- simultaneously) so role_id is NOT unique on its own.

CREATE TABLE ats_job_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES ats_connections(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  -- Merge's stable job ID (returned by client.ats.jobs.list).
  merge_job_id TEXT NOT NULL,
  -- Provider-native job ID (e.g. Greenhouse job ID). Useful for deep-links
  -- back into the customer's ATS UI from our dashboard.
  remote_job_id TEXT,
  job_name TEXT,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  -- When false, the webhook handler will create assessments but NOT email
  -- the candidate; useful for dry-runs against a real ATS without spam.
  auto_invite BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One mapping per (connection, ATS job) — re-mapping the same job replaces
-- the prior row via UPSERT.
CREATE UNIQUE INDEX uq_ats_job_mappings_connection_job
  ON ats_job_mappings(connection_id, merge_job_id);

CREATE INDEX idx_ats_job_mappings_org_id ON ats_job_mappings(org_id);
CREATE INDEX idx_ats_job_mappings_role_id ON ats_job_mappings(role_id);

ALTER TABLE ats_job_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ats_job_mappings_org_members_select" ON ats_job_mappings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = ats_job_mappings.org_id
        AND org_members.user_id = auth.uid()
    )
  );

-- Mutations go through the FastAPI service role, same as ats_connections.
