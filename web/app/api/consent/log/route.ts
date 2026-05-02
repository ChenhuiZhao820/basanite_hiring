// Persist a candidate's pre-interview consents into consent_records.
// Called from /assess/[token]/onboard once the assessment row exists, so we
// can attach the consents to that assessment.
//
// Also flips assessments.object_to_automated_decisions when the candidate
// opted into Article 22 human review. The hirer report later checks this
// flag and surfaces a banner so the reviewer cannot accidentally treat the
// score as a final automated decision.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'

type Payload = {
  assessment_id: string
  consents: {
    over_16?: boolean
    recording?: boolean
    ai_scoring?: boolean
    cv_processing?: boolean
    privacy_notice?: boolean
    object_to_automated_decisions?: boolean
  }
  policy_version?: string
}

// Mask the last octet of a v4 IP for evidentiary value without storing the
// fully identifying address. v6: drop the last 80 bits.
function maskIp(ip: string | null): string | null {
  if (!ip) return null
  const trimmed = ip.split(',')[0].trim()
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':')
    return parts.slice(0, 3).join(':') + '::0'
  }
  const parts = trimmed.split('.')
  if (parts.length === 4) {
    parts[3] = '0'
    return parts.join('.')
  }
  return null
}

// Hash the masked IP so even the partial address isn't stored in plaintext.
function hashIp(ip: string | null): string | null {
  const masked = maskIp(ip)
  if (!masked) return null
  return crypto.createHash('sha256').update(masked).digest('hex').slice(0, 32)
}

export async function POST(req: Request) {
  let body: Payload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.assessment_id) {
    return NextResponse.json({ error: 'assessment_id required' }, { status: 400 })
  }

  const ipHeader = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
  const userAgent = req.headers.get('user-agent') ?? null
  const ipHash = hashIp(ipHeader)
  const policyVersion = body.policy_version ?? '2026-05-02'

  const service = createServiceClient()

  // Fetch the assessment to resolve user_id (may be null for anon flows).
  const { data: assessment, error: aerr } = await service
    .from('assessments')
    .select('id, candidate_user_id')
    .eq('id', body.assessment_id)
    .single()
  if (aerr || !assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  }

  const userId = assessment.candidate_user_id || null
  const consents = body.consents ?? {}

  // Build one consent_records row per consent_type. Each row is independent
  // so a future "withdraw recording consent" can write a granted=false row
  // without disturbing the others.
  const types: Array<{ k: keyof typeof consents; type: string }> = [
    { k: 'over_16', type: 'over_16' },
    { k: 'recording', type: 'recording' },
    { k: 'ai_scoring', type: 'ai_scoring' },
    { k: 'cv_processing', type: 'cv_processing' },
    { k: 'privacy_notice', type: 'privacy_notice' },
    { k: 'object_to_automated_decisions', type: 'object_to_automated_decisions' },
  ]

  const rows = types.map(({ k, type }) => ({
    user_id: userId,
    assessment_id: body.assessment_id,
    consent_type: type,
    granted: !!consents[k],
    policy_version: policyVersion,
    user_agent: userAgent ? userAgent.slice(0, 400) : null,
    ip_hash: ipHash,
  }))

  const { error: ierr } = await service.from('consent_records').insert(rows)
  if (ierr) {
    console.error('consent log insert failed:', ierr.message)
    return NextResponse.json({ error: 'Failed to record consent' }, { status: 500 })
  }

  // Flip the Article 22 flag on the assessment if the candidate objected.
  if (consents.object_to_automated_decisions) {
    await service
      .from('assessments')
      .update({ object_to_automated_decisions: true })
      .eq('id', body.assessment_id)
  }

  return NextResponse.json({ ok: true, recorded: rows.length })
}
