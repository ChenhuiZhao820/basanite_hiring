-- Admin handover: grant is_admin to lynn.zhao@basanite.co.uk and revoke it
-- from andrew.robertson@student.manchester.ac.uk (set in 011_admin_role.sql).
--
-- app_metadata can only be written by the service role (not by the user
-- themselves), making this a tamper-proof role check.
--
-- NOTE: the grant is a no-op if no auth user exists yet for
-- lynn.zhao@basanite.co.uk — create/invite that account first, then re-run.
-- Existing sessions keep their old claims until the user signs in again.

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}'
WHERE email = 'lynn.zhao@basanite.co.uk';

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'is_admin'
WHERE email = 'andrew.robertson@student.manchester.ac.uk';
