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

  // Verify the waitlist entry exists and the email matches, prevents inviting arbitrary addresses
  const { data: entry } = await service.from('waitlist').select('email, persona').eq('id', id).single()
  if (!entry || entry.email !== email) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Invite the user, Supabase sends them a magic link. After email confirmation
  // the callback routes them to /set-password so they can pick one.
  // `data` lands in user_metadata and is exposed to the invite email template
  // as {{ .Data.persona }}, so one Supabase template can render candidate vs
  // hirer copy (see supabase/templates/invite.html).
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basanite.co.uk'
  const { data: invite, error: inviteError } = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${baseUrl}/auth/callback?next=/set-password`,
    data: { persona: entry.persona ?? 'hirer' },
  })
  if (inviteError && inviteError.message !== 'User already registered') {
    console.error('Invite error:', inviteError)
    return NextResponse.json(
      { error: `Failed to send invite: ${inviteError.message}` },
      { status: 500 }
    )
  }

  // Tag the invited user based on their waitlist persona. Candidates get
  // role 'candidate' + is_candidate so middleware routes them to /portal
  // (mirrors /api/auth/tag-candidate — is_candidate MUST live in
  // app_metadata, see ENG-57). Everyone else is a hirer so middleware lets
  // them into /dashboard.
  // Never downgrade an existing hirer to candidate (same rule as
  // tag-candidate) — a hirer who also registered interest as a candidate
  // keeps their dashboard access.
  const isCandidate = entry.persona === 'candidate'
  const targetRole = isCandidate ? 'candidate' : 'hirer'
  const invitedUser = invite?.user
  const wouldDowngradeHirer = isCandidate && invitedUser?.app_metadata?.role === 'hirer'
  if (invitedUser && !wouldDowngradeHirer && invitedUser.app_metadata?.role !== targetRole) {
    const newApp = isCandidate
      ? { ...(invitedUser.app_metadata || {}), role: 'candidate', is_candidate: true }
      : { ...(invitedUser.app_metadata || {}), role: 'hirer' }
    const { error: tagError } = await service.auth.admin.updateUserById(invitedUser.id, {
      app_metadata: newApp,
    })
    if (tagError) {
      console.error('Role tag error:', tagError)
      // Non-fatal: the invite went out, just surface a warning.
    }
  }

  // Mark as approved in the waitlist table
  const { error: updateError } = await service
    .from('waitlist')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    console.error('Waitlist update error:', updateError)
    return NextResponse.json({ error: 'Approved but failed to update status' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
