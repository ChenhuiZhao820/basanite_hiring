-- Add pre-compiled rules column to job_searches.
-- Populated by the deliberation chat; used by the Python orchestrator
-- to skip LLM rule-parsing and apply structured filters directly.
ALTER TABLE job_searches
  ADD COLUMN IF NOT EXISTS rules JSONB;
