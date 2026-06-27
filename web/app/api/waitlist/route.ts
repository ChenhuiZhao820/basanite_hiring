import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { allow, getIP } from '@/lib/rate-limit'

export async function POST(request: Request) {
  // The endpoint does an unauthenticated, RLS-bypassing service-role insert,
  // so cap it per IP to prevent flooding (spam / PII rows).
  const ip = getIP(request)
  if (!(await allow(`waitlist:ip:${ip}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a little while.' },
      { status: 429 },
    )
  }

  let body: { name?: string; email?: string; company?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const name = (body.name ?? '').trim()
  const email = (body.email ?? '').trim().toLowerCase()
  const company = (body.company ?? '').trim() || null

  if (!name) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }
  if (name.length > 200 || email.length > 320 || (company && company.length > 200)) {
    return NextResponse.json({ error: 'Input too long.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('waitlist')
    .insert({ name, email, company, status: 'pending' })

  if (error) {
    // A duplicate email (23505) is reported as success with the SAME body as a
    // fresh insert, so the response can't be used to enumerate which emails are
    // already registered. Any other error is logged server-side and surfaced
    // generically so raw DB / schema details don't leak to the client.
    if (error.code === '23505') {
      return NextResponse.json({ ok: true })
    }
    console.error('waitlist insert failed:', error.message)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
