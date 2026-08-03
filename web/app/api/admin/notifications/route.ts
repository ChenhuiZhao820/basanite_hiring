import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Powers the red-dot notification badge on the admin surfaces:
//   GET  -> { pending_waitlist, new_security_events }
//   POST -> marks security events as seen for the calling admin
//
// "New" security events are rows created after the admin's personal
// security_seen_at watermark (app_metadata, service-role-only so it can't
// be forged client-side). Pending waitlist needs no watermark — the count
// drops to zero once every request is approved or rejected.

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
  })
}

export async function POST() {
  const check = await assertAdmin()
  if (check.error) return check.error

  const service = createServiceClient()
  const { error } = await service.auth.admin.updateUserById(check.user.id, {
    app_metadata: {
      ...(check.user.app_metadata ?? {}),
      security_seen_at: new Date().toISOString(),
    },
  })
  if (error) {
    return NextResponse.json({ error: 'Failed to mark seen' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
