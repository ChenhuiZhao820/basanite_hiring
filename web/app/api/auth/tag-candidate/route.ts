import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Tags the currently-authenticated user with app_metadata.role = 'candidate'.
 * Used right after the candidate signup in /assess/[token]/onboard.
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
    return NextResponse.json({ ok: true, role: existingRole, unchanged: true })
  }

  const service = createServiceClient()
  const newApp = { ...(user.app_metadata || {}), role: 'candidate' }
  const { error } = await service.auth.admin.updateUserById(user.id, { app_metadata: newApp })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, role: 'candidate' })
}
