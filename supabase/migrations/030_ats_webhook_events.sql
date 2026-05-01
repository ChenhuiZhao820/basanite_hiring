-- Basanite: ats_webhook_events
--
-- Idempotency log for inbound Merge webhooks. Merge retries on non-2xx and
-- can deliver duplicates, so every event we successfully process gets a row
-- here keyed on Merge's event identifier. The webhook handler:
--   1. Verifies HMAC.
--   2. Looks up event_id in this table — if found, returns 200 immediately.
--   3. Processes the event.
--   4. Records the row, marking success/failure for ops visibility.

CREATE TABLE ats_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Merge's event identifier (unique per delivery). The header is
  -- `x-merge-webhook-signature` for the HMAC; the event id lives in the
  -- payload as `id` or `webhook_id` depending on event type.
  event_id TEXT NOT NULL UNIQUE,
  hook_type TEXT,            -- e.g. 'Application.created', 'sync.completed'
  linked_account_id TEXT,    -- Merge's linked-account UUID
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processed', 'failed', 'ignored')),
  -- Truncated payload for debugging. Not the full raw body to avoid bloat.
  payload_summary JSONB,
  error_message TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_ats_webhook_events_received_at ON ats_webhook_events(received_at DESC);
CREATE INDEX idx_ats_webhook_events_status ON ats_webhook_events(status);

-- Service role only — no RLS policies for authenticated users.
ALTER TABLE ats_webhook_events ENABLE ROW LEVEL SECURITY;
