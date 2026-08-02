import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

// Candidate portal: download the candidate's own feedback report as PDF.
// Unlike the /assess/{token} route this is keyed purely on the signed-in
// candidate owning the assessment, so it keeps working after the role's
// assessment link is paused, closed, or expired.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  const { assessmentId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const service = createServiceClient()
  const { data: assessment } = await service
    .from('assessments')
    .select('id')
    .eq('id', assessmentId)
    .eq('candidate_user_id', user.id)
    .single()
  if (!assessment) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const res = await fetch(`${PIPELINE_URL}/reports/${assessmentId}/candidate/pdf`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${PIPELINE_SECRET}`,
      'X-Accessed-By': user.id,
      'X-Access-Kind': 'candidate-self',
    },
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    return new Response(text || JSON.stringify({ error: 'Failed to generate PDF' }), {
      status: res.status || 500,
      headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
    })
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': res.headers.get('content-disposition') ?? 'attachment; filename="basanite-feedback.pdf"',
      'Cache-Control': 'private, no-store',
    },
  })
}
