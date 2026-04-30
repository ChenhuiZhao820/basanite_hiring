// Exchanges a Merge public_token (received after the hirer completes the
// Magic Link / React component flow) for the long-lived account_token, which
// FastAPI encrypts and persists. Returns the integration provider so the UI
// can label the new connection.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const publicToken = typeof body?.public_token === 'string' ? body.public_token : ''
  if (!publicToken) {
    return NextResponse.json({ error: 'Missing public_token' }, { status: 400 })
  }

  const res = await fetch(`${PIPELINE_URL}/ats/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PIPELINE_SECRET}`,
    },
    body: JSON.stringify({
      user_id: user.id,
      user_email: user.email,
      public_token: publicToken,
    }),
  })
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  })
}
