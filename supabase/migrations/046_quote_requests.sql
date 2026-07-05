-- Sales quote requests from the pricing page "Get a quote" form.
-- Kept separate from `waitlist` (access grants) and `sample_report_requests`
-- (marketing leads): this is a priced-deal enquiry, a distinct lifecycle.
CREATE TABLE quote_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  email          TEXT NOT NULL,          -- intentionally NOT unique: repeat enquiries are fine
  company        TEXT,
  roles_per_year TEXT,                   -- free-text band, e.g. '4–10'
  timeline       TEXT,                   -- e.g. 'Hiring now'
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX quote_requests_created_idx ON quote_requests (created_at DESC);

ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

-- Public can insert (submit an enquiry). The API uses the service role, which
-- bypasses RLS, but this mirrors the other lead tables and keeps anon-safe.
CREATE POLICY "Anyone can request a quote"
  ON quote_requests FOR INSERT
  WITH CHECK (true);

-- Reads/updates are service-role only (no SELECT/UPDATE policy granted).
