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
  return forwardToPipeline(`/copilot/sessions/${encodeURIComponent(sessionId)}/consent`, {
    method: 'POST',
    body: {
      // The signer is the authenticated interviewer, never client-supplied.
      confirmed_by: check.user.id,
      statement: body?.statement,
    },
  })
}
