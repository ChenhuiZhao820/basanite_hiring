import { NextRequest } from 'next/server'
import { assertCandidateOwnsAssessment } from '@/lib/assess-auth'
import { allow, getIP } from '@/lib/rate-limit'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const body = await request.json()

  const check = await assertCandidateOwnsAssessment(token, body?.assessment_id)
  if (check.error) return check.error

  // Each director tick hits Opus; cap per candidate to 40 calls/interview
  // (sliding 1h window, generous — a 60-min interview fires ~20 ticks).
  const allowed = await allow(`director:${check.user.id}`, 40, 60 * 60 * 1000)
  if (!allowed) {
    return new Response(JSON.stringify({ skip: true, reason: 'rate_limited' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  void getIP

  // Short timeout, if Opus is slow, we skip this tick rather than hang the client.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const res = await fetch(`${PIPELINE_URL}/assess/${token}/director`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ENG-17: forward the internal pipeline secret so FastAPI knows the
        // request originates from this server (which has already authenticated
        // and rate-limited the candidate), not from a public caller holding
        // a leaked assessment_link_token.
        'Authorization': `Bearer ${PIPELINE_SECRET}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const text = await res.text()
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ skip: true, reason: e?.name === 'AbortError' ? 'timeout' : 'error' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } finally {
    clearTimeout(timeout)
  }
}
