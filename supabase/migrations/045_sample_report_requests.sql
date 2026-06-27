-- Sample-report demo requests.
-- Deliberately separate from the `waitlist` table: a waitlist row is an
-- access-grant request (Approve invites the person as a hirer), whereas these
-- are marketing leads who only asked to see sample reports. Co-mingling them
-- would auto-invite tire-kickers and, because waitlist.email is UNIQUE, would
-- silently drop a genuine later access request from the same email.
CREATE TABLE sample_report_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,           -- intentionally NOT unique: repeat requests are fine
  company     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX sample_report_requests_created_idx ON sample_report_requests (created_at DESC);

ALTER TABLE sample_report_requests ENABLE ROW LEVEL SECURITY;

-- Public can insert (submit a request). The API uses the service role, which
-- bypasses RLS, but this mirrors the waitlist table and keeps anon-safe.
CREATE POLICY "Anyone can request sample reports"
  ON sample_report_requests FOR INSERT
  WITH CHECK (true);

-- Reads/updates are service-role only (no SELECT/UPDATE policy granted).
