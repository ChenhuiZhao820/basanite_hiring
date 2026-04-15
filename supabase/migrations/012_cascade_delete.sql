-- Add ON DELETE CASCADE to candidates.job_search_id so that deleting a
-- job_search atomically removes all its candidates at the DB level.
-- This replaces the two-step delete in the Next.js API which could orphan
-- candidates if the second DELETE failed.

ALTER TABLE candidates
  DROP CONSTRAINT IF EXISTS candidates_job_search_id_fkey;

ALTER TABLE candidates
  ADD CONSTRAINT candidates_job_search_id_fkey
  FOREIGN KEY (job_search_id)
  REFERENCES job_searches(id)
  ON DELETE CASCADE;
