// Manage ATS-job → Basanite-role mappings.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(`${PIPELINE_URL}/ats/job-mappings`)
  url.searchParams.set('user_id', user.id)
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${PIPELINE_SECRET}` },
    cache: 'no-store',
  })
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const payload = { ...(body as Record<string, unknown>), user_id: user.id }

  const res = await fetch(`${PIPELINE_URL}/ats/job-mappings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PIPELINE_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  })
}
