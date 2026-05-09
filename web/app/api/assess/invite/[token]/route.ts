// Public proxy for resolving a candidate invite token to an assessment.
// No authentication — the invite_token IS the auth. ENG-30 added a 60/hr
// per-IP rate limit on this endpoint at both Next.js and FastAPI layers
// to throttle leaked-token harvesting.

import { allow, getIP } from '@/lib/rate-limit'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const ip = getIP(request)
  if (!(await allow(`invite:${ip}`, 60, 60 * 60 * 1000))) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    })
  }

  const { token } = await context.params
  const res = await fetch(`${PIPELINE_URL}/assess/invite/${encodeURIComponent(token)}`, {
    cache: 'no-store',
  })
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  })
}
