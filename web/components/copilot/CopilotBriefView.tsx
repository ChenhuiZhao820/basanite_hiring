'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDimensionKey } from '@/lib/format'

type Props = {
  roleId: string
  sessionId: string
}

type SessionPayload = {
  session: { status: string; brief_pack: any }
  assessment: { candidate_name: string | null }
  role: { title: string | null; dimensions: string[]; interview_plan: any }
}

// Pre-interview brief: the locked, hirer-approved interview plan (read-only)
// with the candidate-specific layer interleaved per dimension.
export function CopilotBriefView({ roleId, sessionId }: Props) {
  const router = useRouter()
  const [data, setData] = useState<SessionPayload | null>(null)
  const [brief, setBrief] = useState<any>(null)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/copilot/sessions/${sessionId}`)
        const payload = await res.json().catch(() => ({} as any))
        if (!res.ok) throw new Error(payload.detail ?? payload.error ?? 'Failed to load session')
        if (cancelled) return
        setData(payload)
        const existing = payload.session?.brief_pack
        if (existing && !existing.error) {
          setBrief(existing)
          return
        }
        setGenerating(true)
        const briefRes = await fetch(`/api/copilot/sessions/${sessionId}/brief`, { method: 'POST' })
        const briefPayload = await briefRes.json().catch(() => ({} as any))
        if (!briefRes.ok) throw new Error(briefPayload.detail ?? briefPayload.error ?? 'Brief generation failed')
        if (!cancelled) setBrief(briefPayload.brief_pack)
      } catch (e: any) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setGenerating(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [sessionId])

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }
  if (!data) {
    return <p className="text-sm text-basanite-400 dark:text-earth-500">Loading session…</p>
  }

  const plan = data.role.interview_plan ?? {}
  const planDims: any[] = Array.isArray(plan.dimension_plans) ? plan.dimension_plans : []
  const briefByDim: Record<string, any> = {}
  for (const b of brief?.dimension_briefs ?? []) {
    if (b?.dimension) briefByDim[b.dimension] = b
  }

  return (
    <div className="max-w-3xl">
      {brief?.candidate_summary && (
        <div className="border border-gold-500/30 bg-gold-500/5 p-5 mb-6">
          <p className="text-xs text-basanite-600 dark:text-earth-300 font-medium uppercase tracking-wide mb-2">Candidate summary</p>
          <p className="text-sm text-basanite-800 dark:text-earth-100">{brief.candidate_summary}</p>
        </div>
      )}
      {generating && (
        <p className="text-xs text-basanite-400 dark:text-earth-500 mb-4">Generating candidate brief…</p>
      )}

      {plan.overview && (
        <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5 mb-4">
          <p className="text-xs text-basanite-400 dark:text-earth-500 uppercase tracking-wide mb-2">Approved plan — overview</p>
          <p className="text-sm text-basanite-800 dark:text-earth-100">{plan.overview}</p>
        </div>
      )}

      <div className="space-y-4 mb-8">
        {planDims.map((dp) => {
          const b = briefByDim[dp.dimension] ?? {}
          return (
            <div key={dp.dimension} className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5">
              <h3 className="font-display text-base text-basanite-900 dark:text-earth-100 mb-3">
                {formatDimensionKey(dp.dimension)}
              </h3>
              {dp.focus && (
                <p className="text-sm text-basanite-700 dark:text-earth-200 mb-2"><span className="font-medium">Focus:</span> {dp.focus}</p>
              )}
              {dp.probing_strategy && (
                <p className="text-sm text-basanite-700 dark:text-earth-200 mb-2"><span className="font-medium">Probing:</span> {dp.probing_strategy}</p>
              )}
              {dp.evaluation_criteria && (
                <p className="text-sm text-basanite-700 dark:text-earth-200 mb-2"><span className="font-medium">Strong vs weak evidence:</span> {dp.evaluation_criteria}</p>
              )}
              {Array.isArray(dp.example_questions) && dp.example_questions.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-basanite-400 dark:text-earth-500 uppercase tracking-wide mb-1">Approved angles</p>
                  <ul className="list-disc pl-5 text-sm text-basanite-700 dark:text-earth-200 space-y-1">
                    {dp.example_questions.map((q: string, i: number) => <li key={i}>{q}</li>)}
                  </ul>
                </div>
              )}
              {(b.cv_anchored_angles?.length > 0 || b.claims_to_verify?.length > 0) && (
                <div className="mt-3 border-t border-earth-200 dark:border-basanite-700 pt-3">
                  {b.cv_anchored_angles?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-gold-600 uppercase tracking-wide mb-1">For this candidate</p>
                      <ul className="list-disc pl-5 text-sm text-basanite-700 dark:text-earth-200 space-y-1">
                        {b.cv_anchored_angles.map((a: string, i: number) => <li key={i}>{a}</li>)}
                      </ul>
                    </div>
                  )}
                  {b.claims_to_verify?.length > 0 && (
                    <div>
                      <p className="text-xs text-gold-600 uppercase tracking-wide mb-1">CV claims to verify</p>
                      <ul className="list-disc pl-5 text-sm text-basanite-700 dark:text-earth-200 space-y-1">
                        {b.claims_to_verify.map((c: string, i: number) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => router.push(`/dashboard/roles/${roleId}/copilot/${sessionId}/live`)}
        className="bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white text-xs font-medium px-5 py-2.5 transition-colors"
      >
        Start interview
      </button>
    </div>
  )
}
