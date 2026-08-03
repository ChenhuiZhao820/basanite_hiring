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
  return forwardToPipeline(`/copilot/sessions/${encodeURIComponent(sessionId)}/probe-event`, {
    method: 'POST',
    body: {
      action: body?.action,
      dimension_key: body?.dimension_key ?? null,
      technique: body?.technique ?? null,
      probe_text: body?.probe_text ?? null,
      reason: body?.reason ?? null,
    },
  })
}
