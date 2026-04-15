-- ── job_searches ─────────────────────────────────────────────────────────────
CREATE TABLE job_searches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'running', 'complete', 'failed')),
  candidate_count INT DEFAULT 0,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_job_searches_user_id ON job_searches(user_id);
CREATE INDEX idx_job_searches_status  ON job_searches(status);

-- ── Tag candidates with their job search ─────────────────────────────────────
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS job_search_id UUID REFERENCES job_searches(id);

CREATE INDEX idx_candidates_job_search_id ON candidates(job_search_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE job_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_searches: owner select"
  ON job_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "job_searches: owner insert"
  ON job_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Python API uses the service-role key and bypasses RLS to update status.
-- Next.js API routes also use the service-role key server-side.
