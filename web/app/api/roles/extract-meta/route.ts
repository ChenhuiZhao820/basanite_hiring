// Suggests a role title + company name from a JD so the role-creation
// form can autofill empty fields. Forwards to FastAPI, which runs the
// Haiku extraction with the server-only pipeline secret.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { allow } from '@/lib/rate-limit'
import { isSuspended, suspendedResponse } from '@/lib/suspension'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isSuspended(user)) return suspendedResponse()

  // One Haiku call per request; 40/hour per hirer is far above the
  // handful of autofills a real role-creation session triggers.
  const allowed = await allow(`jd-meta:${user.id}`, 40, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const jd = typeof body?.job_description === 'string' ? body.job_description : ''
  if (!jd.trim()) {
    // Nothing to extract; return empty rather than round-tripping.
    return NextResponse.json({ title: '', company_name: '' })
  }

  try {
    const res = await fetch(`${PIPELINE_URL}/roles/extract-meta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PIPELINE_SECRET}`,
      },
      body: JSON.stringify({ job_description: jd.slice(0, 20000) }),
    })
    const data = await res.json().catch(() => ({}))
    // Autofill is a nicety — never surface a hard error to the caller.
    if (!res.ok) return NextResponse.json({ title: '', company_name: '' })
    return NextResponse.json({
      title: typeof data.title === 'string' ? data.title : '',
      company_name: typeof data.company_name === 'string' ? data.company_name : '',
    })
  } catch {
    return NextResponse.json({ title: '', company_name: '' })
  }
}
