ALTER TABLE job_searches
  ADD COLUMN IF NOT EXISTS progress_message TEXT;
