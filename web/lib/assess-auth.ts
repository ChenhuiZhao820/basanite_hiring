import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * DEV-ONLY local-testing bypass. When active, the candidate guards below
 * skip Supabase browser/session auth entirely so the flow can be exercised
 * locally without configuring the browser anon key. Double-gated: it can
 * NEVER be active in production, and additionally requires the explicit
 * ALLOW_TEST_CANDIDATE=1 flag, which must live only in gitignored .env
 * files and never be committed. Do not push this flag to remote.
 */
export const TEST_CANDIDATE_BYPASS =
  process.env.NODE_ENV !== 'production' &&
  process.env.ALLOW_TEST_CANDIDATE === '1'

/**
 * Returns true if the role's optional token expiry has passed.
 * NULL / undefined means the token never expires (ENG-20).
 */
function isTokenExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  const t = Date.parse(expiresAt)
  if (Number.isNaN(t)) return true  // fail closed on malformed timestamps
  return t <= Date.now()
}

/**
 * Look up the role by token, enforcing the optional ENG-20 expiry.
 * Returns null if the token is unknown OR expired (caller doesn't need
 * to distinguish; both surface as 404 / "Not found").
 */
async function lookupRoleByToken(
  service: ReturnType<typeof createServiceClient>,
  token: string,
): Promise<{ id: string } | null> {
  // ENG-20's expiry column (migration 037) is optional and may not be
  // present on every database. Selecting a non-existent column makes
  // PostgREST 400, which previously surfaced here as `data: null` →
  // a spurious 404 / "Not found" for EVERY candidate (cv-upload, start,
  // voice-session …). Try with the expiry column first; if the migration
  // hasn't been applied, fall back to a column-agnostic lookup so the
  // flow keeps working. Self-optimises back to one query once 037 lands.
  let res = await service
    .from('roles')
    .select('id, assessment_link_token_expires_at')
    .eq('assessment_link_token', token)
    .maybeSingle()
  if (res.error) {
    res = await service
      .from('roles')
      .select('id')
      .eq('assessment_link_token', token)
      .maybeSingle()
  }
  const role = res.data as { id: string; assessment_link_token_expires_at?: string | null } | null
  if (!role) return null
  if (isTokenExpired(role.assessment_link_token_expires_at)) return null
  return { id: role.id }
}

/**
 * Verify the caller is signed in and owns the assessment for this token.
 *
 * The four-way join token↔role↔assessment↔candidate_user_id is the only
 * thing separating one candidate's voice session, director tick, transcript,
 * or recording from another's. The backend only checks token↔role; this
 * helper adds the candidate binding the backend cannot see (no auth header).
 */
export async function assertCandidateOwnsAssessment(
  token: string,
  assessmentId: string | null | undefined,
): Promise<
  | { error: Response; user?: never; role?: never; assessment?: never }
  | { error?: never; user: { id: string }; role: { id: string }; assessment: { id: string } }
> {
  if (!assessmentId) {
    return {
      error: NextResponse.json({ error: 'Missing assessment_id' }, { status: 400 }),
    }
  }

  // DEV-ONLY bypass: skip the candidate binding and just confirm the
  // assessment belongs to the token's role. Never active in production.
  if (TEST_CANDIDATE_BYPASS) {
    const service = createServiceClient()
    const role = await lookupRoleByToken(service, token)
    if (!role) {
      return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
    }
    const { data: assessment } = await service
      .from('assessments')
      .select('id, candidate_user_id')
      .eq('id', assessmentId)
      .eq('role_id', role.id)
      .single()
    if (!assessment) {
      return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
    }
    return {
      user: { id: assessment.candidate_user_id ?? 'test:local' },
      role,
      assessment: { id: assessment.id },
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const service = createServiceClient()
  const role = await lookupRoleByToken(service, token)
  if (!role) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }

  const { data: assessment } = await service
    .from('assessments')
    .select('id')
    .eq('id', assessmentId)
    .eq('role_id', role.id)
    .eq('candidate_user_id', user.id)
    .single()
  if (!assessment) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }

  return { user: { id: user.id }, role, assessment }
}

/**
 * Weaker guard for routes that run BEFORE an assessment exists (cv-upload,
 * start). Only requires a signed-in user and a valid token-linked role.
 */
export async function assertCandidateSession(
  token: string,
): Promise<
  | { error: Response; user?: never; role?: never }
  | { error?: never; user: { id: string }; role: { id: string } }
> {
  // DEV-ONLY bypass: skip Supabase session auth and just resolve the role
  // from the token. Never active in production.
  if (TEST_CANDIDATE_BYPASS) {
    const service = createServiceClient()
    const role = await lookupRoleByToken(service, token)
    if (!role) {
      return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
    }
    return { user: { id: 'test:local' }, role }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const service = createServiceClient()
  const role = await lookupRoleByToken(service, token)
  if (!role) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }

  return { user: { id: user.id }, role }
}
