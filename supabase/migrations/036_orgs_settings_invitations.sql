-- Organisations as a first-class entity.
--
-- The orgs/org_members tables exist since migration 026, but until now every
-- hirer's "org" has been a personal workspace with id = user_id, never shared
-- with anyone. This migration adds the columns and table needed to turn an
-- org into a real shared workspace: a display description, an auto-join
-- email-domain hook, and an org_invitations table for the explicit
-- token-based invite flow.
--
-- Free email domains (gmail.com etc.) are blocked from the auto-join lookup
-- at the application layer, not via a CHECK constraint here — the blocklist
-- is iterated in core/orgs.py and we don't want a domain DB schema migration
-- every time a new free webmail launches.

ALTER TABLE orgs ADD COLUMN IF NOT EXISTS description TEXT;

-- Auto-join domain is unique-but-nullable. UNIQUE on a partial expression
-- index so multiple orgs can have NULL but no two orgs can share an active
-- auto-join domain. LOWER() to normalise — domain matching is
-- case-insensitive everywhere we compare.
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS auto_join_domain TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orgs_auto_join_domain
  ON orgs(LOWER(auto_join_domain)) WHERE auto_join_domain IS NOT NULL;

-- Invitations: owner/admin mints a token, emails it via Resend; recipient
-- clicks /accept-invite?token=... and the token-to-membership exchange
-- happens in api.py. Token is the only auth — verified-email check happens
-- at the moment of acceptance.
CREATE TABLE IF NOT EXISTS org_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_invitations_org_id_pending
  ON org_invitations(org_id) WHERE accepted_at IS NULL AND cancelled_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_org_invitations_email_pending
  ON org_invitations(LOWER(email)) WHERE accepted_at IS NULL AND cancelled_at IS NULL;

ALTER TABLE org_invitations ENABLE ROW LEVEL SECURITY;

-- Owners/admins of the org can read pending invitations to render them
-- on the settings page. Mutations go through the FastAPI service role
-- (same pattern as ats_connections / org_custom_voices).
CREATE POLICY "org_invitations_owner_select" ON org_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = org_invitations.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('owner', 'admin')
    )
  );
