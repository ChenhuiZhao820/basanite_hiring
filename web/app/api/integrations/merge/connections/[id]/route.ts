// Disconnect (mark as 'disconnected') a connection for the calling hirer.
// FastAPI verifies that the connection's org matches the caller's org.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const url = new URL(`${PIPELINE_URL}/ats/connections/${encodeURIComponent(id)}`)
  url.searchParams.set('user_id', user.id)
  const res = await fetch(url.toString(), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${PIPELINE_SECRET}` },
  })
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  })
}
