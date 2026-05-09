-- ENG-29: candidate-side UPDATE policy on assessments lacked WITH CHECK,
-- letting an authenticated candidate UPDATE arbitrary columns on their
-- own row via PostgREST. From the browser console:
--
--   await supabase.from('assessments').update({
--     candidate_user_id: '<another-uuid>',
--     status: 'completed',
--     cv_extracted: { /* fake CV */ },
--     role_id: '<a-different-role-id>'
--   }).eq('id', '<my-assessment-id>')
--
-- The Python tier already routes every legitimate candidate-side write
-- through FastAPI + service-role (cv-upload, start, voice-session,
-- upload-recording, finalize, complete are all service-role calls).
-- The RLS policy was dead code that only existed as an attack surface.
--
-- Drop the candidate INSERT and UPDATE policies entirely. The candidate
-- SELECT policy stays so SSR pages can read their own row through the
-- authenticated SSR client; all writes go through the API.

DROP POLICY IF EXISTS "assessments_candidate_insert" ON assessments;
DROP POLICY IF EXISTS "assessments_candidate_update" ON assessments;

-- Force RLS so a future code path that mistakenly uses an authenticated
-- client where it should use service-role still trips. (Service-role
-- bypasses via the BYPASSRLS attribute, so this doesn't break the API.)
ALTER TABLE assessments FORCE ROW LEVEL SECURITY;
