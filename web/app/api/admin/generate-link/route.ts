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

  const { data, error } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${baseUrl}/auth/callback?next=/set-password` },
  })
  if (error) {
    console.error('[admin-generate-link] failed:', error)
    return NextResponse.json(
      { error: `Could not generate link: ${error.message}` },
      { status: 500 },
    )
  }

  // Modern Supabase SDK returns the URL on data.properties.action_link;
  // we also tolerate older versions that put it at the top level.
  const actionLink =
    data?.properties?.action_link
    ?? (data as { action_link?: string } | null | undefined)?.action_link
    ?? null
  if (!actionLink) {
    return NextResponse.json(
      { error: 'Supabase returned no action link.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, action_link: actionLink })
}
