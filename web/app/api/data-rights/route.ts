// Submit a Data Subject Access Request (DSAR).
// We log the request, mint a verification token, email it to the address
// the user supplied, and exit. Only after the user clicks the link do we
// flip status='verified' and action it.
//
// Why verification: stops third parties from triggering deletions for
// somebody else's email. The token lives 24h.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { allow, getIP } from '@/lib/rate-limit'
import crypto from 'crypto'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

type Payload = {
  type: 'export' | 'erasure' | 'rectification' | 'objection' | 'restriction'
  email: string
  details?: string
}

export async function POST(req: Request) {
  let body: Payload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.type || !['export', 'erasure', 'rectification', 'objection', 'restriction'].includes(body.type)) {
    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
  }
  const email = (body.email || '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  // ENG-56: every DSAR submission fires a verification email through
  // Resend on Basanite's domain. Without a cap this is an email-bomb
  // relay: an attacker hits this endpoint with a target's email
  // address to spam their inbox with Basanite-branded mail. Cap to
  // 3/hr per IP (reasonable for legitimate retry behaviour) and
  // 1/hr per email (one DSAR for any given address per hour is
  // enough — a victim doesn't need 60 verification emails).
  const ip = getIP(req)
  const ipOk = await allow(`dsar-submit:ip:${ip}`, 3, 60 * 60 * 1000)
  const emailOk = await allow(`dsar-submit:email:${email}`, 1, 60 * 60 * 1000)
  if (!ipOk || !emailOk) {
    // Generic message — don't disclose which key tripped, so a
    // probing attacker can't distinguish "this email already has a
    // pending DSAR" from "I've been throttled by IP".
    return NextResponse.json({ error: 'Please try again later' }, { status: 429 })
  }

  const service = createServiceClient()
  const verificationToken = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { error: ierr } = await service.from('dsar_requests').insert({
    email,
    request_type: body.type,
    status: 'pending',
    verification_token: verificationToken,
    verification_expires_at: expiresAt,
    details: body.details ? { details: body.details.slice(0, 4000) } : null,
  })

  if (ierr) {
    console.error('dsar insert failed:', ierr.message)
    return NextResponse.json({ error: 'Failed to record request' }, { status: 500 })
  }

  // Best-effort email through the FastAPI service which has Resend wired.
  // If the email fails, the user can still verify by visiting the URL we
  // print to logs (only in dev) — in prod this WILL block them which is OK
  // because the alternative is silent acceptance of unverifiable requests.
  try {
    const verifyUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basanite.co.uk'}/data-rights/verify?token=${verificationToken}`
    await fetch(`${PIPELINE_URL}/data-rights/email-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PIPELINE_SECRET}`,
      },
      body: JSON.stringify({
        to: email,
        request_type: body.type,
        verify_url: verifyUrl,
      }),
    })
  } catch (e) {
    // Logged but not surfaced — user is told to "check email"; if they don't
    // get one they'll re-submit and we'll try again.
    console.error('dsar verify email send failed:', e)
  }

  return NextResponse.json({ ok: true })
}
