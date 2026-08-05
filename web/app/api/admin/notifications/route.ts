import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Powers the red-dot notification badge on the admin surfaces and the
// per-admin email-notification preference:
//   GET  -> { pending_waitlist, new_security_events, email_notifications_enabled }
//   POST -> { action: 'mark_security_seen' } (default when no body)
//           { action: 'set_email_notifications', enabled: boolean }
//
// "New" security events are rows created after the admin's personal
// security_seen_at watermark. Both the watermark and the opt-out flag live
// in app_metadata (service-role-only so they can't be forged client-side).
// Pending waitlist needs no watermark — the count drops to zero once every
// request is approved or rejected.

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

  const waitlistQuery = service
    .from('waitlist')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  const seenAt = check.user.app_metadata?.security_seen_at as string | undefined
  let securityQuery = service
    .from('security_events')
    .select('id', { count: 'exact', head: true })
  if (seenAt) securityQuery = securityQuery.gt('created_at', seenAt)

  const [waitlist, security] = await Promise.all([waitlistQuery, securityQuery])

  return NextResponse.json({
    pending_waitlist: waitlist.count ?? 0,
    new_security_events: security.count ?? 0,
    email_notifications_enabled: check.user.app_metadata?.admin_notifications_disabled !== true,
  })
}

export async function POST(request: NextRequest) {
  const check = await assertAdmin()
  if (check.error) return check.error

  // The security page POSTs with no body; default to the original action
  // so existing callers keep working.
  const body = await request.json().catch(() => ({})) as { action?: string; enabled?: boolean }
  const action = body.action ?? 'mark_security_seen'

  const patch: Record<string, unknown> = {}
  if (action === 'mark_security_seen') {
    patch.security_seen_at = new Date().toISOString()
  } else if (action === 'set_email_notifications') {
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'Provide enabled (boolean)' }, { status: 400 })
    }
    // updateUserById merges app_metadata shallowly, so explicitly falsify
    // rather than relying on key deletion (same pattern as suspension).
    patch.admin_notifications_disabled = !body.enabled
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service.auth.admin.updateUserById(check.user.id, {
    app_metadata: { ...(check.user.app_metadata ?? {}), ...patch },
  })
  if (error) {
    return NextResponse.json({ error: 'Failed to update preference' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
