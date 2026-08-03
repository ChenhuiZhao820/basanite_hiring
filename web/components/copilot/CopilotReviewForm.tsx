'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDimensionKey } from '@/lib/format'

type Props = {
  roleId: string
  sessionId: string
}

type ProposedScore = {
  dimension: string
  score: number | null
  quotation_basis: string
  notes: string
  verified?: boolean
}

// The review screen: proposed scores dimension by dimension, each grounded
// in verbatim statements. Confirm or override (reason required), edit the
// synthesis, submit — the human's signature is the score of record.
export function CopilotReviewForm({ roleId, sessionId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [proposed, setProposed] = useState<ProposedScore[]>([])
  const [scores, setScores] = useState<Record<string, number>>({})
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [synthesis, setSynthesis] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/copilot/sessions/${sessionId}`)
        const data = await res.json().catch(() => ({} as any))
        if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Failed to load session')
        if (cancelled) return
        const status = data.session?.status
        if (status === 'submitted') {
          router.replace(`/dashboard/roles/${roleId}`)
          return
        }
        let review = data.session?.proposed_review
        if (!review || review.error) {
          // Landed here with the wrap-up pass still pending (or failed) — run it.
          const wrapRes = await fetch(`/api/copilot/sessions/${sessionId}/wrapup`, { method: 'POST' })
          const wrapData = await wrapRes.json().catch(() => ({} as any))
          if (!wrapRes.ok) throw new Error(wrapData.detail ?? wrapData.error ?? 'Scoring failed — retry')
          review = wrapData.proposed_review
        }
        if (cancelled) return
        const rows: ProposedScore[] = review?.proposed_scores ?? []
        setProposed(rows)
        setScores(Object.fromEntries(rows.map((r) => [r.dimension, r.score ?? 3])))
        setSynthesis(review?.synthesis ?? '')
      } catch (e: any) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [sessionId, roleId, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    for (const row of proposed) {
      const chosen = scores[row.dimension]
      if (row.score !== null && chosen !== row.score && !(reasons[row.dimension] ?? '').trim()) {
        setError(`Overriding ${formatDimensionKey(row.dimension)} requires a reason.`)
        return
      }
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/copilot/sessions/${sessionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          synthesis,
          scores: proposed.map((row) => ({
            dimension: row.dimension,
            score: scores[row.dimension],
            override_reason: (reasons[row.dimension] ?? '').trim() || null,
          })),
        }),
      })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Failed to submit review')
      router.push(`/dashboard/roles/${roleId}`)
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-basanite-400 dark:text-earth-500">Preparing proposed scores…</p>
  }
  if (proposed.length === 0) {
    return <p className="text-sm text-red-600">{error || 'No proposed scores available.'}</p>
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl">
      <div className="space-y-4 mb-8">
        {proposed.map((row) => {
          const chosen = scores[row.dimension]
          const isOverride = row.score !== null && chosen !== row.score
          return (
            <div key={row.dimension} className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="font-display text-base text-basanite-900 dark:text-earth-100">
                  {formatDimensionKey(row.dimension)}
                </h3>
                <span className="text-xs text-basanite-400 dark:text-earth-500">
                  Proposed: {row.score ?? '—'}/5
                </span>
              </div>
              {row.quotation_basis && (
                <blockquote className="border-l-2 border-gold-500/60 pl-3 text-sm text-basanite-600 dark:text-earth-300 italic mb-1.5">
                  &ldquo;{row.quotation_basis}&rdquo;
                </blockquote>
              )}
              {row.verified === false && (
                <p className="text-xs text-yellow-700 dark:text-yellow-500 mb-1.5">
                  Quote could not be verified against the transcript — treat with care.
                </p>
              )}
              {row.notes && <p className="text-xs text-basanite-500 dark:text-earth-400 mb-3">{row.notes}</p>}

              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs text-basanite-400 dark:text-earth-500 mr-1">Your score:</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setScores((s) => ({ ...s, [row.dimension]: n }))}
                    className={`w-8 h-8 text-xs font-medium border transition-colors ${
                      chosen === n
                        ? 'bg-basanite-900 dark:bg-gold-600 text-white border-basanite-900 dark:border-gold-600'
                        : 'border-earth-300 dark:border-basanite-700 text-basanite-600 dark:text-earth-300 hover:border-gold-500'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {isOverride && (
                <div>
                  <label htmlFor={`reason-${row.dimension}`} className="block text-xs text-yellow-700 dark:text-yellow-500 mb-1">
                    Override reason (required)
                  </label>
                  <textarea
                    id={`reason-${row.dimension}`}
                    rows={2}
                    maxLength={1000}
                    value={reasons[row.dimension] ?? ''}
                    onChange={(e) => setReasons((r) => ({ ...r, [row.dimension]: e.target.value }))}
                    className="w-full border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 px-3 py-2 text-sm text-basanite-900 dark:text-earth-100 focus:outline-none focus:border-gold-500"
                    placeholder="What did you see that the engine missed?"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mb-8">
        <label htmlFor="synthesis" className="block text-xs text-basanite-600 dark:text-earth-300 font-medium uppercase tracking-wide mb-2">
          Synthesis — what this candidate is likely to be like to work with
        </label>
        <textarea
          id="synthesis"
          rows={6}
          required
          maxLength={5000}
          value={synthesis}
          onChange={(e) => setSynthesis(e.target.value)}
          className="w-full border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 px-3 py-2.5 text-sm text-basanite-900 dark:text-earth-100 focus:outline-none focus:border-gold-500"
        />
        <p className="text-xs text-basanite-400 dark:text-earth-500 mt-1.5">
          Drafted by the engine — edit freely. This goes into the hirer report.
        </p>
      </div>

      {error && <p className="text-xs text-red-600 mb-4">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white text-xs font-medium px-5 py-2.5 transition-colors disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Sign off & submit — generates both reports'}
      </button>
    </form>
  )
}
