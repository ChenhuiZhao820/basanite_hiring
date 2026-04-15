-- Private storage bucket for candidate answer recordings (audio+video webm, one per answer).
-- Writes and reads happen through the Python backend using the service-role key;
-- no anon/authenticated client access is granted.

insert into storage.buckets (id, name, public)
values ('interview-recordings', 'interview-recordings', false)
on conflict (id) do nothing;

-- Explicit deny for non-service-role: no policies created means RLS blocks all
-- anon/authenticated access by default. The service role bypasses RLS.
