// ENG-58: revoke every session for the calling user.
//
// signOut({ scope: 'global' }) tells Supabase to invalidate all
// refresh tokens for the user, not just the one in the current
// browser. Used when a user wants to recover from device theft or a
// suspected session leak.
//
// Returns 401 if the caller isn't authenticated; this isn't a public
// "sign out anyone" endpoint.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { error } = await supabase.auth.signOut({ scope: 'global' })
  if (error) {
    return NextResponse.json({ error: 'Failed to sign out everywhere' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
