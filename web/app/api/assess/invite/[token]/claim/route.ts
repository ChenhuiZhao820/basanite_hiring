// Claim an invited assessment for the signed-in candidate. The invite
// token identifies the assessment; the Supabase session identifies the
// candidate. We forward the AUTHENTICATED user id + email to the backend
// (never client-supplied values), which enforces the invited-email match
// and binds candidate_user_id.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { allow } from '@/lib/rate-limit'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = await allow(`invite-claim:${user.id}`, 10, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const res = await fetch(`${PIPELINE_URL}/assess/invite/${encodeURIComponent(token)}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PIPELINE_SECRET}`,
    },
    body: JSON.stringify({ user_id: user.id, email: user.email ?? '' }),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
