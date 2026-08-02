import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSuspended, suspendedResponse } from '@/lib/suspension'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // The middleware parks suspended users on /suspended, but a stale session
  // can still fire direct fetches — block role creation here too.
  if (isSuspended(user)) return suspendedResponse()

  const body = await request.json()
  const res = await fetch(`${PIPELINE_URL}/roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PIPELINE_SECRET}`,
    },
    body: JSON.stringify({ ...body, user_id: user.id }),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roles } = await supabase
    .from('roles')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json(roles ?? [])
}
