CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  linkedin_url TEXT UNIQUE,
  "current_role" TEXT,
  current_company TEXT,
  location TEXT,
  raw_headline TEXT,
  skills JSONB,
  years_experience INT,
  source TEXT,
  source_signal TEXT,
  contacted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_candidates_source ON candidates(source);
CREATE INDEX idx_candidates_contacted ON candidates(contacted);
