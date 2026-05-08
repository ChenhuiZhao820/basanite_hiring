import { NextRequest, NextResponse } from 'next/server'
import { allow, getIP } from '@/lib/rate-limit'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  // Public landing GET (no auth) — token is in the URL. Cap to 60/hr per
  // IP to block token enumeration / scraping.
  const allowed = await allow(`assess-landing:${getIP(request)}`, 60, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const res = await fetch(`${PIPELINE_URL}/assess/${token}`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
