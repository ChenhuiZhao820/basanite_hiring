-- Enable Row Level Security on the candidates table.
--
-- The Python pipeline uses the service-role key which bypasses RLS entirely,
-- so all existing pipeline writes continue to work unchanged.
--
-- Next.js API routes use the service-role key via createServiceClient(), so
-- they also bypass RLS — this is intentional since ownership checks are
-- already enforced at the application layer (job_search_id → user_id lookup).
--
-- With RLS enabled, the anon/authenticated roles have zero access to candidates
-- by default, meaning a misconfigured client using the anon key cannot leak data.

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- No explicit policies needed for the anon/authenticated roles — default-deny
-- is what we want. Service role bypasses RLS automatically.
--
-- If you ever add client-side direct Supabase queries for candidates,
-- add a policy here:
--
-- CREATE POLICY "owners can read their candidates"
--   ON candidates FOR SELECT
--   USING (
--     job_search_id IN (
--       SELECT id FROM job_searches WHERE user_id = auth.uid()
--     )
--   );
