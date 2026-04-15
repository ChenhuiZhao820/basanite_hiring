import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.app_metadata?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, email } = await request.json() as { id: string; email: string }
  if (!id || !email) {
    return NextResponse.json({ error: 'Missing id or email' }, { status: 400 })
  }

  const service = createServiceClient()

  // Verify the waitlist entry exists and the email matches — prevents inviting arbitrary addresses
  const { data: entry } = await service.from('waitlist').select('email').eq('id', id).single()
  if (!entry || entry.email !== email) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Invite the user — Supabase sends them a magic link to set their password
  const { error: inviteError } = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basanite.co.uk'}/auth/callback`,
  })
  if (inviteError && inviteError.message !== 'User already registered') {
    console.error('Invite error:', inviteError)
    return NextResponse.json({ error: 'Failed to send invite.' }, { status: 500 })
  }

  // Mark as approved in the waitlist table
  const { error: updateError } = await service
    .from('waitlist')
    .update({ status: 'approved' })
    .eq('id', id)

  if (updateError) {
    console.error('Waitlist update error:', updateError)
    return NextResponse.json({ error: 'Approved but failed to update status' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
