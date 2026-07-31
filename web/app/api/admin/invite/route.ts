import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { allow } from '@/lib/rate-limit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Single-step admin invite. Skips the waitlist dance and directly
 * invites a hirer by email: inserts a waitlist row (so existing admin
 * tooling that joins on the table keeps working), sends the Supabase
 * invite email, tags the user as a hirer in app_metadata, and marks
 * the waitlist row approved.
 *
 * Falls back to a magic-link if the email is already registered, so
 * the admin can re-send a fresh sign-in link to an existing user from
 * the same UI rather than chasing the generate-link endpoint manually.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.app_metadata?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 30 invites/hr/admin is well above any real workflow and absorbs
  // double-click accidents without ever blocking honest usage.
  const ok = await allow(`admin-invite:${user.id}`, 30, 60 * 60 * 1000)
  if (!ok) {
    return NextResponse.json(
      { error: 'Too many invites this hour. Wait a bit and try again.' },
      { status: 429 },
    )
  }

  let body: { email?: string; name?: string; company?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const name = (body.name ?? '').trim() || email.split('@')[0]
  const company = (body.company ?? '')?.trim() || null

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }
  if (email.length > 320 || name.length > 200 || (company && company.length > 200)) {
    return NextResponse.json({ error: 'Input too long.' }, { status: 400 })
  }

  const service = createServiceClient()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basanite.co.uk'
  const redirectTo = `${baseUrl}/auth/callback?next=/set-password`

  // Upsert into waitlist so the existing admin UI shows the invited
  // user as approved. unique-on-email index makes upsert safe; the
  // 23505 unique-violation path means "already there" — fine, just
  // mark approved.
  const { data: waitlistRow, error: waitlistError } = await service
    .from('waitlist')
    .upsert(
      { name, email, company, status: 'approved', approved_at: new Date().toISOString() },
      { onConflict: 'email' },
    )
    .select('id')
    .single()
  if (waitlistError) {
    console.error('[admin-invite] waitlist upsert failed:', waitlistError)
    return NextResponse.json(
      { error: `Failed to persist invitation: ${waitlistError.message}` },
      { status: 500 },
    )
  }

  // Try the invite first. If the email is already registered Supabase
  // returns a specific error; in that case fall back to a fresh magic
  // link so the admin's call always produces a working email.
  const { data: invite, error: inviteError } = await service.auth.admin.inviteUserByEmail(
    email,
    { redirectTo },
  )

  let invitedUser = invite?.user
  let mode: 'invited' | 'magic_link' = 'invited'

  if (inviteError) {
    const alreadyRegistered =
      inviteError.message === 'User already registered' ||
      /already.*registered/i.test(inviteError.message ?? '') ||
      inviteError.status === 422

    if (!alreadyRegistered) {
      console.error('[admin-invite] invite failed:', inviteError)
      return NextResponse.json(
        { error: `Failed to send invite: ${inviteError.message}` },
        { status: 500 },
      )
    }

    // Existing user — generate a fresh magic link instead. Supabase
    // sends the email automatically for generateLink({type:'magiclink'})
    // when the user exists.
    const { data: link, error: linkError } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    })
    if (linkError) {
      console.error('[admin-invite] magiclink fallback failed:', linkError)
      return NextResponse.json(
        { error: `User exists but magic link could not be generated: ${linkError.message}` },
        { status: 500 },
      )
    }
    invitedUser = link?.user
    mode = 'magic_link'
  }

  // Tag as hirer so middleware lets them into /dashboard. Non-fatal
  // if it fails — the invite already went out and we can re-tag later.
  if (invitedUser && invitedUser.app_metadata?.role !== 'hirer') {
    const nextMeta = { ...(invitedUser.app_metadata ?? {}), role: 'hirer' }
    const { error: tagError } = await service.auth.admin.updateUserById(invitedUser.id, {
      app_metadata: nextMeta,
    })
    if (tagError) {
      console.error('[admin-invite] role tag failed:', tagError)
    }
  }

  return NextResponse.json({
    ok: true,
    mode,
    waitlist_id: waitlistRow?.id ?? null,
    user_id: invitedUser?.id ?? null,
  })
}
