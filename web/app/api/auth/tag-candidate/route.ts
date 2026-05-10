import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Tags the currently-authenticated user with app_metadata.role = 'candidate'
 * AND app_metadata.is_candidate = true. Used right after the candidate
 * signup in /assess/[token]/onboard.
 *
 * ENG-57: is_candidate MUST be in app_metadata (service-role-write-only),
 * never user_metadata (user-writable via auth.updateUser). The middleware
 * gate uses app_metadata.is_candidate; if it lived in user_metadata, a
 * candidate could flip it from the browser console and reach /dashboard.
 *
 * Safe: only sets candidate if no role is set yet, never downgrades a hirer.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const existingRole = user.app_metadata?.role
  if (existingRole) {
    // Backfill: if role is already set but is_candidate flag isn't yet
    // (legacy accounts created before ENG-57), set the flag now so the
    // middleware can rely on it. Doesn't downgrade hirers.
    if (existingRole === 'candidate' && !user.app_metadata?.is_candidate) {
      const service = createServiceClient()
      await service.auth.admin.updateUserById(user.id, {
        app_metadata: { ...(user.app_metadata || {}), is_candidate: true },
      })
    }
    return NextResponse.json({ ok: true, role: existingRole, unchanged: true })
  }

  const service = createServiceClient()
  const newApp = {
    ...(user.app_metadata || {}),
    role: 'candidate',
    is_candidate: true,
  }
  const { error } = await service.auth.admin.updateUserById(user.id, { app_metadata: newApp })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, role: 'candidate' })
}
