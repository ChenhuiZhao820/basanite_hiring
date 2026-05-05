// Proxy: forwards multipart from VoiceCloneRecorder to FastAPI's
// /voices/clone, with the calling user's id appended as a form field.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Pass-through the multipart body, but append user_id so the FastAPI
  // side can resolve the org without a separate auth round-trip.
  const incoming = await req.formData()
  const fd = new FormData()
  for (const [k, v] of incoming.entries()) fd.append(k, v as string | Blob)
  fd.set('user_id', user.id)

  const res = await fetch(`${PIPELINE_URL}/voices/clone`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PIPELINE_SECRET}` },
    body: fd,
  })
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  })
}
