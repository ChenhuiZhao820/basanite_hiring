-- Feedback captured when a hirer takes a role live with zero evaluation
-- dimensions. Dimensions are the core of the product, so we ask why they
-- were skipped — the structured reason (plus optional free text for
-- "other") feeds product decisions about the dimension set.
CREATE TABLE go_live_feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  user_id    UUID,                    -- hirer who took the role live
  reason     TEXT NOT NULL,           -- structured key, e.g. 'general_screen'
  details    TEXT,                    -- free text, only when reason = 'other'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX go_live_feedback_created_idx ON go_live_feedback (created_at DESC);

ALTER TABLE go_live_feedback ENABLE ROW LEVEL SECURITY;

-- Service-role only (no policies granted): rows are written by the FastAPI
-- backend at go-live and read by admins out-of-band.
