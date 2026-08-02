-- Grant is_admin to lalli378@gmail.com (same pattern as 048_admin_handover.sql).
--
-- app_metadata can only be written by the service role (not by the user
-- themselves), making this a tamper-proof role check.
--
-- NOTE: this is a no-op if no auth user exists yet for lalli378@gmail.com —
-- create/invite that account first, then re-run. An existing session keeps
-- its old claims until the user signs in again.

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}'
WHERE email = 'lalli378@gmail.com';
