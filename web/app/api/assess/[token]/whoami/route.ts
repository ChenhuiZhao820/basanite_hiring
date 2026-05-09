// ENG-45: server-side resolver for the candidate's current assessment_id.
// The /start route sets an httpOnly cookie carrying the binding; the
// interview and complete pages call this endpoint to retrieve it
// without trusting sessionStorage.

import { NextRequest, NextResponse } from 'next/server'
import { assertCandidateSession } from '@/lib/assess-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const check = await assertCandidateSession(token)
  if (check.error) return check.error

  const cookie = request.cookies.get(`assessment_${token}`)
  if (!cookie?.value) {
    return NextResponse.json({ assessment_id: null }, { status: 404 })
  }
  return NextResponse.json({ assessment_id: cookie.value })
}
