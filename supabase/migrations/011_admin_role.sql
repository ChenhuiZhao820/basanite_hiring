-- Set is_admin: true in app_metadata for the admin user.
-- app_metadata can only be written by the service role (not by the user themselves),
-- making this a tamper-proof role check compared to hardcoded email comparison.
--
-- Run once after applying this migration:
--   UPDATE auth.users
--   SET raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}'
--   WHERE email = 'andrew.robertson@student.manchester.ac.uk';

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}'
WHERE email = 'andrew.robertson@student.manchester.ac.uk';
