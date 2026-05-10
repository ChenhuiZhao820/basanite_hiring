// ENG-58: rate-limited password-reset trigger.
//
// The candidate onboard page used to call supabase.auth.resetPasswordForEmail()
// directly from the browser. Supabase has its own server-side rate limit, but
// nothing client-side stopped a script from sending hundreds of requests per
// second to the same target — enough to spam the victim's inbox before
// Supabase's per-user cap kicks in. We now proxy through this route so the
// allow() helper bounds it to 3/hr/email + 5/hr/IP.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { allow, getIP } from '@/lib/rate-limit'

type Payload = {
  email?: string
  redirect_to?: string
}

export async function POST(req: Request) {
  let body: Payload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const ip = getIP(req)
  const ipOk = await allow(`forgot-password:ip:${ip}`, 5, 60 * 60 * 1000)
  const emailOk = await allow(`forgot-password:email:${email}`, 3, 60 * 60 * 1000)
  if (!ipOk || !emailOk) {
    // Generic message — don't disclose whether the email or IP tripped
    // (and don't reveal whether the account exists at all). The
    // candidate retries; the spammer gets stonewalled.
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  const supabase = await createClient()
  const redirectTo = typeof body.redirect_to === 'string' ? body.redirect_to : undefined

  // We deliberately ignore the result — Supabase's response leaks
  // whether the account exists. Always return 200 with a generic OK so
  // the caller can't enumerate accounts via timing or the response body.
  await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined)
  return NextResponse.json({ ok: true })
}
