-- Basanite: explicit deny-all on interview-recordings storage.
--
-- Migration 022 relies on Supabase's default behaviour that, with RLS
-- enabled and zero policies attached, no anon/authenticated client can
-- read or write. That is safe today, but it is invisible — any future
-- migration or dashboard toggle that adds a permissive policy would
-- silently grant access.
--
-- These explicit deny policies make the intent durable: even if the
-- bucket is accidentally marked public, or a broader policy is added
-- later, direct reads and writes from anon/authenticated roles will
-- still be refused. The service role bypasses RLS, so the Python
-- backend continues to function unchanged.

create policy "interview_recordings_deny_select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id <> 'interview-recordings');

create policy "interview_recordings_deny_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id <> 'interview-recordings');

create policy "interview_recordings_deny_update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id <> 'interview-recordings');

create policy "interview_recordings_deny_delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id <> 'interview-recordings');
