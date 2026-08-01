import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Admin surface for the tiered injection policy (migration 051):
//   GET  -> security events (newest first) + currently-suspended accounts
//   POST -> { action: 'suspend' | 'reinstate', user_id } manual override
//
// Suspension lives in app_metadata.suspended (service-role-only, read by
// the middleware); every manual action also writes an audit row so the
// account history in security_events reads end to end.

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.app_metadata?.is_admin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user }
}

export async function GET() {
  const check = await assertAdmin()
  if (check.error) return check.error

  const service = createServiceClient()

  const { data: events } = await service
    .from('security_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  // Resolve user_ids to emails for display, and collect currently-suspended
  // accounts. listUsers is paginated; one page of 1000 is far beyond the
  // current account count — revisit if that ever stops being true.
  const { data: usersPage } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const users = usersPage?.users ?? []
  const emailById = new Map(users.map(u => [u.id, u.email ?? '']))

  const suspended = users
    .filter(u => u.app_metadata?.suspended === true)
    .map(u => ({
      id: u.id,
      email: u.email ?? '',
      suspended_at: (u.app_metadata?.suspended_at as string) ?? null,
      suspended_reason: (u.app_metadata?.suspended_reason as string) ?? null,
    }))

  const enriched = (events ?? []).map(e => ({
    ...e,
    user_email: emailById.get(e.user_id) ?? null,
  }))

  return NextResponse.json({ events: enriched, suspended })
}

export async function POST(request: NextRequest) {
  const check = await assertAdmin()
  if (check.error) return check.error

  const { action, user_id } = await request.json() as { action?: string; user_id?: string }
  if (!user_id || (action !== 'suspend' && action !== 'reinstate')) {
    return NextResponse.json({ error: 'Provide user_id and action (suspend | reinstate)' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: target, error: fetchError } = await service.auth.admin.getUserById(user_id)
  if (fetchError || !target?.user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  if (action === 'suspend' && target.user.app_metadata?.is_admin === true) {
    return NextResponse.json({ error: 'Admin accounts cannot be suspended' }, { status: 400 })
  }

  const current = { ...(target.user.app_metadata ?? {}) }
  if (action === 'suspend') {
    current.suspended = true
    current.suspended_at = new Date().toISOString()
    current.suspended_reason = 'Manual admin action'
  } else {
    // updateUserById merges app_metadata shallowly, so explicitly falsify
    // rather than relying on key deletion.
    current.suspended = false
    current.suspended_at = null
    current.suspended_reason = null
  }

  const { error: updateError } = await service.auth.admin.updateUserById(user_id, {
    app_metadata: current,
  })
  if (updateError) {
    return NextResponse.json({ error: `Failed to ${action}: ${updateError.message}` }, { status: 500 })
  }

  // Audit trail — best-effort; the metadata flip above is the enforcement.
  await service.from('security_events').insert({
    user_id,
    kind: action === 'suspend' ? 'admin_suspend' : 'admin_reinstate',
    severity: 'info',
    detail: { by: check.user.id },
  })

  return NextResponse.json({ ok: true })
}
