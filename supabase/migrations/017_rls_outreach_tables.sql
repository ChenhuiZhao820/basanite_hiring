-- Enable RLS on outreach tables that were created directly in Supabase
-- without corresponding migration files. Service role bypasses RLS automatically,
-- so pipeline writes are unaffected. Anon/authenticated roles get zero access
-- by default (same pattern as candidates table).

ALTER TABLE job_vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_send_log ENABLE ROW LEVEL SECURITY;
