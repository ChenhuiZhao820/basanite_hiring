import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { allow, getIP } from '@/lib/rate-limit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Sales quote requests from the pricing page. Kept separate from the
// access-grant `waitlist` and the `sample_report_requests` tables.
export async function POST(request: Request) {
  const ip = getIP(request)
  if (!(await allow(`quote:ip:${ip}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a little while.' },
      { status: 429 },
    )
  }

  let body: {
    name?: string
    email?: string
    company?: string
    rolesPerYear?: string
    timeline?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const name = (body.name ?? '').trim()
  const email = (body.email ?? '').trim().toLowerCase()
  const company = (body.company ?? '').trim() || null
  const rolesPerYear = (body.rolesPerYear ?? '').trim() || null
  const timeline = (body.timeline ?? '').trim() || null

  if (!name) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }
  if (
    name.length > 200 ||
    email.length > 320 ||
    (company && company.length > 200) ||
    (rolesPerYear && rolesPerYear.length > 40) ||
    (timeline && timeline.length > 40)
  ) {
    return NextResponse.json({ error: 'Input too long.' }, { status: 400 })
  }

  // Best-effort capture: getting the buyer to a quote conversation is the goal,
  // so a storage failure (e.g. migration 046 not yet applied) must not block
  // them. Log server-side and still return success.
  try {
    const service = createServiceClient()
    const { error } = await service
      .from('quote_requests')
      .insert({ name, email, company, roles_per_year: rolesPerYear, timeline })
    if (error) {
      console.error('quote request insert failed:', error.message)
    }
  } catch (err) {
    console.error('quote request capture error:', err)
  }

  return NextResponse.json({ ok: true })
}
