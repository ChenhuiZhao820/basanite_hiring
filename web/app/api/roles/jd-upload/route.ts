import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { allow } from '@/lib/rate-limit'
import { isSuspended, suspendedResponse } from '@/lib/suspension'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

// 10 MB — mirrors the FastAPI-side _MAX_JD_UPLOAD_BYTES so oversized files
// are bounced here without crossing the network.
const MAX_JD_BYTES = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isSuspended(user)) return suspendedResponse()

  // File parsing + the Haiku classifier run per upload; 20/hour per hirer
  // is far above legitimate use while capping abuse cost.
  const allowed = await allow(`jd-upload:${user.id}`, 20, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (file.size > MAX_JD_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 })
  }

  // Rebuild the form server-side: the user_id the strike ladder attributes
  // events to must come from the verified session, never the client body.
  const outbound = new FormData()
  outbound.append('file', file)
  outbound.append('user_id', user.id)

  const res = await fetch(`${PIPELINE_URL}/roles/jd-upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PIPELINE_SECRET}` },
    body: outbound,
  })

  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  })
}
