// Mints a Merge Link Token for the calling hirer's org. Forwards to FastAPI
// which talks to Merge with the server-only MERGE_API_KEY.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const nameHint =
    (typeof body?.name_hint === 'string' && body.name_hint) ||
    (user.user_metadata as Record<string, unknown> | null)?.full_name as string | undefined ||
    user.email?.split('@')[0] ||
    'Hirer'

  const res = await fetch(`${PIPELINE_URL}/ats/link-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PIPELINE_SECRET}`,
    },
    body: JSON.stringify({
      user_id: user.id,
      user_email: user.email,
      name_hint: nameHint,
    }),
  })
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  })
}
