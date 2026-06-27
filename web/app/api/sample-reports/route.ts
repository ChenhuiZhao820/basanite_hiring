import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { allow, getIP } from '@/lib/rate-limit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Marketing leads who want to preview the sample reports. Kept separate from
// the access-grant `waitlist` table on purpose (see migration 045).
export async function POST(request: Request) {
  // The portal is linked from the homepage, so the endpoint is public. Cap it.
  const ip = getIP(request)
  if (!(await allow(`sample-reports:ip:${ip}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a little while.' },
      { status: 429 },
    )
  }

  let body: { name?: string; email?: string; company?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const name = (body.name ?? '').trim()
  const email = (body.email ?? '').trim().toLowerCase()
  const company = (body.company ?? '').trim() || null

  if (!name) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }
  if (name.length > 200 || email.length > 320 || (company && company.length > 200)) {
    return NextResponse.json({ error: 'Input too long.' }, { status: 400 })
  }

  // Best-effort capture. Delivering the sample reports is the visitor's goal,
  // so a storage failure (e.g. migration 045 not yet applied in this env) must
  // not block them: log it server-side and still return success.
  try {
    const service = createServiceClient()
    const { error } = await service
      .from('sample_report_requests')
      .insert({ name, email, company })
    if (error) {
      console.error('sample-report request insert failed:', error.message)
    }
  } catch (err) {
    console.error('sample-report request capture error:', err)
  }

  return NextResponse.json({ ok: true })
}
