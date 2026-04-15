-- Add warnings array to job_searches so the pipeline can flag issues
-- (e.g. LinkedIn skipped due to expired cookies) visible to the user.
ALTER TABLE job_searches ADD COLUMN IF NOT EXISTS warnings TEXT[] DEFAULT '{}';
