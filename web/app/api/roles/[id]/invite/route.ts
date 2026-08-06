// Hirer-initiated candidate invite: creates a pending assessment with a
// unique invite token on the backend and emails the candidate their
// personal /assess/invite/{token} link. Auth: hirer session + role
// ownership, mirroring the go-live route.

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { allow } from '@/lib/rate-limit'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: role } = await service
    .from('roles')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const candidateName = String(body?.candidate_name ?? '').trim()
  const candidateEmail = String(body?.candidate_email ?? '').trim()
  if (!candidateName || candidateName.length > 200) {
    return NextResponse.json({ error: 'Candidate name is required' }, { status: 400 })
  }
  if (!EMAIL_RE.test(candidateEmail) || candidateEmail.length > 320) {
    return NextResponse.json({ error: 'A valid candidate email is required' }, { status: 400 })
  }

  // Each invite sends an email; cap per hirer so a compromised account
  // can't be used as a spam cannon.
  const allowed = await allow(`role-invite:${user.id}`, 30, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many invites — try again later' }, { status: 429 })
  }

  const res = await fetch(`${PIPELINE_URL}/roles/${id}/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PIPELINE_SECRET}`,
    },
    body: JSON.stringify({
      user_id: user.id,
      candidate_name: candidateName,
      candidate_email: candidateEmail,
    }),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
