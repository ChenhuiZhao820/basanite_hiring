import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { allow } from '@/lib/rate-limit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Admin-only endpoint that returns a fresh single-use sign-in link
 * for a given email, without sending an email. Lets the admin copy-
 * paste it via Telegram / Signal / out-of-band channel when the
 * Supabase email reliably gets junked by the recipient's provider.
 *
 * Always emits a magic-link tied to the destination user. Supabase's
 * `invite` link type rejects already-registered users; this endpoint
 * sidesteps that by always using `magiclink`, which works for both
 * fresh-from-invite and existing accounts.
 *
 * Default expiry is set by the Supabase project config (1h on this
 * project as of 2026-06-09). The link is single-use; once the user
 * clicks, it can't be re-used by a leaked-paste.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.app_metadata?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 60/hr/admin — comfortable headroom over manual retries; an admin
  // genuinely needing more than this in an hour has a different
  // problem.
  const ok = await allow(`admin-genlink:${user.id}`, 60, 60 * 60 * 1000)
  if (!ok) {
    return NextResponse.json(
      { error: 'Too many link requests this hour.' },
      { status: 429 },
    )
  }

  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email) || email.length > 320) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }

  const service = createServiceClient()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basanite.co.uk'
  const redirectTo = `${baseUrl}/auth/callback?next=/set-password`

  // Always start with an invite-style link. This is the right link for a
  // candidate (or hirer) who let the original account-creation email expire,
  // because it lets them confirm their email and set a password. If the user
  // is already confirmed, fall back to a one-time sign-in link.
  let mode: 'invite' | 'magic_link' = 'invite'
  let actionLink: string | null = null

  const { data: inviteData, error: inviteErr } = await service.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo },
  })

  if (inviteErr) {
    const alreadyRegistered =
      inviteErr.message === 'User already registered' ||
      /already.*registered/i.test(inviteErr.message ?? '')

    if (!alreadyRegistered) {
      console.error('[admin-generate-link] failed:', inviteErr)
      return NextResponse.json(
        { error: `Could not generate link: ${inviteErr.message}` },
        { status: 500 },
      )
    }

    // Confirmed/returning user — use a fresh sign-in link.
    const { data: magicData, error: magicErr } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    })
    if (magicErr) {
      console.error('[admin-generate-link] magiclink failed:', magicErr)
      return NextResponse.json(
        { error: `Could not generate sign-in link: ${magicErr.message}` },
        { status: 500 },
      )
    }
    mode = 'magic_link'
    actionLink =
      magicData?.properties?.action_link
      ?? (magicData as { action_link?: string } | null | undefined)?.action_link
      ?? null
  } else if (inviteData?.user?.email_confirmed_at) {
    // generateLink for an existing, already-confirmed user will still create an
    // invite-style link; for a sign-in use-case, swap it for a magic link.
    const { data: magicData, error: magicErr } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    })
    if (magicErr) {
      console.error('[admin-generate-link] magiclink failed:', magicErr)
      return NextResponse.json(
        { error: `Could not generate sign-in link: ${magicErr.message}` },
        { status: 500 },
      )
    }
    mode = 'magic_link'
    actionLink =
      magicData?.properties?.action_link
      ?? (magicData as { action_link?: string } | null | undefined)?.action_link
      ?? null
  } else {
    mode = 'invite'
    actionLink =
      inviteData?.properties?.action_link
      ?? (inviteData as { action_link?: string } | null | undefined)?.action_link
      ?? null
  }

  if (!actionLink) {
    return NextResponse.json(
      { error: 'Supabase returned no action link.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, mode, action_link: actionLink })
}
