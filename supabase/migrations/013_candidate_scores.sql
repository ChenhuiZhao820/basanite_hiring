-- Migration 013: candidate_scores join table (SYS-6)
--
-- Allows one candidate to have match scores for multiple job searches.
-- Previously, match_score/match_reason on the candidates table was overwritten
-- by each new search, discarding the score computed for the new search when the
-- candidate already existed (CRIT-1 fix preserved original search score, but
-- made it impossible to score for subsequent searches).
--
-- This table stores one score row per (candidate, job_search) pair.
-- The candidates.match_score / match_reason columns remain for backward
-- compatibility with the dashboard — they continue to store the FIRST search score.

CREATE TABLE IF NOT EXISTS candidate_scores (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id   UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_search_id  UUID NOT NULL REFERENCES job_searches(id) ON DELETE CASCADE,
  match_score    INTEGER,
  match_reason   TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (candidate_id, job_search_id)
);

-- Index for fast lookups by job search (dashboard: "show all candidates for search X")
CREATE INDEX IF NOT EXISTS candidate_scores_job_search_idx
  ON candidate_scores (job_search_id, match_score DESC);

-- Index for fast lookups by candidate (candidate profile: "show all searches this candidate matched")
CREATE INDEX IF NOT EXISTS candidate_scores_candidate_idx
  ON candidate_scores (candidate_id);

-- RLS: service role only (same pattern as candidates table)
ALTER TABLE candidate_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON candidate_scores
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER candidate_scores_updated_at
  BEFORE UPDATE ON candidate_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
