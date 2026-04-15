import { NextRequest, NextResponse } from 'next/server'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const res = await fetch(`${PIPELINE_URL}/assess/${token}`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
