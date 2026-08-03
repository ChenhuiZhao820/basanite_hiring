import { NextRequest } from 'next/server'
import { assertOwnsCopilotSession, forwardToPipeline } from '@/lib/copilot-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const check = await assertOwnsCopilotSession(sessionId)
  if (check.error) return check.error

  const body = await request.json().catch(() => ({}))
  return forwardToPipeline(`/copilot/sessions/${encodeURIComponent(sessionId)}/review`, {
    method: 'POST',
    body: {
      // The signature of record is the authenticated interviewer.
      signed_off_by: check.user.id,
      synthesis: body?.synthesis,
      scores: Array.isArray(body?.scores) ? body.scores : [],
    },
  })
}
