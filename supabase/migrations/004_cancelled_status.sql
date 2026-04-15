-- Allow 'cancelled' as a valid job_search status
ALTER TABLE job_searches
  DROP CONSTRAINT IF EXISTS job_searches_status_check;

ALTER TABLE job_searches
  ADD CONSTRAINT job_searches_status_check
  CHECK (status IN ('pending', 'running', 'complete', 'failed', 'cancelled'));
