import { NextRequest, NextResponse } from 'next/server'
import { assertCandidateSession } from '@/lib/assess-auth'
import { allow } from '@/lib/rate-limit'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  const check = await assertCandidateSession(token)
  if (check.error) return check.error

  // Cap CV parses to 10/hour per signed-in candidate to limit PDF-parse abuse.
  const allowed = await allow(`cv:${check.user.id}`, 10, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const form = await request.formData()
  // Attribute the upload to the verified candidate session so the backend
  // can key injection strikes to the right account. Server-set — any
  // user_id the client tried to smuggle into the form is overwritten.
  form.set('user_id', check.user.id)
  const res = await fetch(`${PIPELINE_URL}/assess/${token}/cv-upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PIPELINE_SECRET}` },
    body: form,
  })

  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  })
}
