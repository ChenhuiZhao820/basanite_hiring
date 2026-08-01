import type { User } from '@supabase/supabase-js'

// Tamper-proof suspension flag, set exclusively by the FastAPI service role
// (see core/db.set_user_suspended) after repeated corroborated prompt-
// injection attempts, or manually by an admin. Lives in app_metadata, which
// clients cannot write (same trust model as role / is_admin / is_candidate).
//
// Checked in two places:
//   - middleware.ts: redirects suspended users to /suspended for all pages
//   - mutating API routes: blocks a suspended user with a stale session
//     from acting via direct fetch

export function isSuspended(user: User | null | undefined): boolean {
  return user?.app_metadata?.suspended === true
}

export const SUSPENDED_MESSAGE =
  'Your account is suspended pending review. Contact support@basanite.co.uk to resolve this.'

export function suspendedResponse() {
  return Response.json({ error: SUSPENDED_MESSAGE }, { status: 403 })
}
