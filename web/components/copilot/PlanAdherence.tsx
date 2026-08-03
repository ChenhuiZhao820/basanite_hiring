'use client'

import { formatDimensionKey } from '@/lib/format'

export type PlanAdherenceData = {
  coverage?: Record<string, string>
  probe_uptake?: {
    suggested: number
    asked: number
    adapted: number
    dismissed: number
    uptake_rate: number | null
  }
  planned_angles?: { total: number; asked_near_verbatim: number }
  summary?: string
}

type Props = {
  adherence: PlanAdherenceData | null
}

const COVERAGE_STYLE: Record<string, { label: string; cls: string }> = {
  covered: { label: 'Covered', cls: 'text-green-700 dark:text-green-500' },
  partial: { label: 'Partial', cls: 'text-yellow-700 dark:text-yellow-500' },
  skipped: { label: 'Not explored', cls: 'text-basanite-400 dark:text-earth-500' },
}

// Observation, not a grade: how the interview tracked the approved plan.
// Deviating from plan is often correct interviewing — this exists as
// context for interpreting the scores below it.
export function PlanAdherence({ adherence }: Props) {
  if (!adherence || !adherence.summary) return null
  const coverage = adherence.coverage ?? {}
  const uptake = adherence.probe_uptake
  const angles = adherence.planned_angles

  return (
    <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5 mb-6">
      <p className="text-xs text-basanite-400 dark:text-earth-500 uppercase tracking-wide mb-2">Plan adherence</p>
      <p className="text-sm text-basanite-700 dark:text-earth-200 mb-4">{adherence.summary}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-basanite-400 dark:text-earth-500 mb-1.5">Dimension coverage</p>
          <div className="space-y-1">
            {Object.entries(coverage).map(([dim, level]) => {
              const style = COVERAGE_STYLE[level] ?? COVERAGE_STYLE.skipped
              return (
                <div key={dim} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-basanite-700 dark:text-earth-200 truncate">{formatDimensionKey(dim)}</span>
                  <span className={`text-xs shrink-0 ${style.cls}`}>{style.label}</span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="space-y-3">
          {uptake && uptake.suggested > 0 && (
            <div>
              <p className="text-xs text-basanite-400 dark:text-earth-500 mb-1.5">Probe guidance</p>
              <p className="text-xs text-basanite-700 dark:text-earth-200">
                {uptake.suggested} suggested · {uptake.asked} asked · {uptake.adapted} adapted · {uptake.dismissed} dismissed
                {uptake.uptake_rate !== null && (
                  <span className="text-gold-600"> — {Math.round(uptake.uptake_rate * 100)}% uptake</span>
                )}
              </p>
            </div>
          )}
          {angles && angles.total > 0 && (
            <div>
              <p className="text-xs text-basanite-400 dark:text-earth-500 mb-1.5">Approved question angles</p>
              <p className="text-xs text-basanite-700 dark:text-earth-200">
                {angles.asked_near_verbatim} of {angles.total} asked near-verbatim
                <span className="text-basanite-400 dark:text-earth-500"> (paraphrased versions aren&apos;t counted)</span>
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="text-[11px] text-basanite-300 dark:text-earth-600 mt-3">
        Context, not a grade — going off-plan to chase what a candidate just said is often the right call.
      </p>
    </div>
  )
}
