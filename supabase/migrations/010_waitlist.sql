CREATE TABLE waitlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  company     TEXT,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Public can insert (submit a waitlist request)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist"
  ON waitlist FOR INSERT
  WITH CHECK (true);

-- Only service role (admin) can read/update
