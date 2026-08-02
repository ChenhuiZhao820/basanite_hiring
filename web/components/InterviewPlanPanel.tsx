'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDimensionKey } from '@/lib/format'

type DimensionPlan = {
  dimension: string
  focus: string
  probing_strategy: string
  evaluation_criteria: string
  example_questions: string[]
}

type Plan = {
  overview: string
  opening_approach: string
  dimension_plans: DimensionPlan[]
  closing_approach: string
}

type Props = {
  roleId: string
  status: string
  initialPlan: Plan | null
  planEditedAt: string | null
}

function normalisePlan(p: any): Plan | null {
  if (!p || typeof p !== 'object') return null
  return {
    overview: p.overview ?? '',
    opening_approach: p.opening_approach ?? '',
    dimension_plans: Array.isArray(p.dimension_plans)
      ? p.dimension_plans.map((d: any) => ({
          dimension: d?.dimension ?? '',
          focus: d?.focus ?? '',
          probing_strategy: d?.probing_strategy ?? '',
          evaluation_criteria: d?.evaluation_criteria ?? '',
          example_questions: Array.isArray(d?.example_questions) ? d.example_questions : [],
        }))
      : [],
    closing_approach: p.closing_approach ?? '',
  }
}

export function InterviewPlanPanel({ roleId, status, initialPlan, planEditedAt }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(status === 'draft')
  const [plan, setPlan] = useState<Plan | null>(() => normalisePlan(initialPlan))
  const [draft, setDraft] = useState<Plan | null>(null) // non-null while editing
  const [busy, setBusy] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [edited, setEdited] = useState(Boolean(planEditedAt))

  const isDraft = status === 'draft'
  const editing = draft !== null

  async function handleGenerate() {
    setError('')
    setGenerating(true)
    try {
      const res = await fetch(`/api/roles/${roleId}/generate-plan`, { method: 'POST' })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Plan generation failed')
      setPlan(normalisePlan(data.interview_plan))
      setDraft(null)
      setEdited(false)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!draft) return
    setError('')
    setBusy(true)
    try {
      const cleaned: Plan = {
        ...draft,
        dimension_plans: draft.dimension_plans.map(d => ({
          ...d,
          example_questions: d.example_questions.map(q => q.trim()).filter(Boolean),
        })),
      }
      const res = await fetch(`/api/roles/${roleId}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interview_plan: cleaned }),
      })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Failed to save plan')
      setPlan(normalisePlan(data.interview_plan) ?? cleaned)
      setDraft(null)
      setEdited(true)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const view = draft ?? plan

  return (
    <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 mb-8">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-earth-50 dark:hover:bg-basanite-700 transition-colors"
      >
        <div>
          <p className="text-xs text-basanite-600 dark:text-earth-300 font-medium uppercase tracking-wide">Interview Plan</p>
          <p className="text-xs text-basanite-400 dark:text-earth-500 mt-1">
            {isDraft
              ? 'How the AI interviewer will run and evaluate this interview. Review and adjust before going live.'
              : 'Locked when the role went live.'}
            {edited && ' Edited by you.'}
          </p>
        </div>
        <span className="flex items-center gap-3 shrink-0 ml-4">
          {!isDraft && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-basanite-400 dark:text-earth-500" aria-label="Locked">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`text-basanite-400 dark:text-earth-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="border-t border-earth-200 dark:border-basanite-700 px-5 py-5">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 mb-4">{error}</div>
          )}

          {!view ? (
            <div className="text-center py-6">
              <p className="text-sm text-basanite-500 dark:text-earth-400 mb-4">No interview plan has been generated for this role yet.</p>
              {isDraft && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white text-xs font-medium px-4 py-2 transition-colors disabled:opacity-60"
                >
                  {generating ? 'Generating…' : 'Generate interview plan'}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Sections */}
              <PlanSection
                label="Overview"
                value={view.overview}
                editing={editing}
                onChange={v => setDraft(d => d && { ...d, overview: v })}
              />
              <PlanSection
                label="Opening"
                value={view.opening_approach}
                editing={editing}
                onChange={v => setDraft(d => d && { ...d, opening_approach: v })}
              />

              {view.dimension_plans.map((dp, i) => (
                <div key={`${dp.dimension}-${i}`} className="mb-5 border-l-2 border-gold-500/40 pl-4">
                  <p className="text-sm font-medium text-basanite-900 dark:text-earth-100 mb-2">
                    {formatDimensionKey(dp.dimension)}
                  </p>
                  <PlanSection
                    label="Focus"
                    value={dp.focus}
                    editing={editing}
                    compact
                    onChange={v => setDraft(d => d && updateDim(d, i, { focus: v }))}
                  />
                  <PlanSection
                    label="Probing strategy"
                    value={dp.probing_strategy}
                    editing={editing}
                    compact
                    onChange={v => setDraft(d => d && updateDim(d, i, { probing_strategy: v }))}
                  />
                  <PlanSection
                    label="Evaluation criteria"
                    value={dp.evaluation_criteria}
                    editing={editing}
                    compact
                    onChange={v => setDraft(d => d && updateDim(d, i, { evaluation_criteria: v }))}
                  />
                  <div className="mb-3">
                    <p className="text-xs text-basanite-400 dark:text-earth-500 uppercase tracking-wide mb-1">Example questions</p>
                    {editing ? (
                      <textarea
                        value={dp.example_questions.join('\n')}
                        onChange={e => setDraft(d => d && updateDim(d, i, { example_questions: e.target.value.split('\n') }))}
                        rows={Math.max(2, dp.example_questions.length)}
                        placeholder="One question per line"
                        className="w-full border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 px-3 py-2 text-sm text-basanite-900 dark:text-earth-100 focus:outline-none focus:border-gold-500"
                      />
                    ) : dp.example_questions.length > 0 ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {dp.example_questions.map((q, qi) => (
                          <li key={qi} className="text-sm text-basanite-700 dark:text-earth-200 leading-relaxed">{q}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-basanite-400 dark:text-earth-500">—</p>
                    )}
                  </div>
                </div>
              ))}

              <PlanSection
                label="Closing"
                value={view.closing_approach}
                editing={editing}
                onChange={v => setDraft(d => d && { ...d, closing_approach: v })}
              />

              {/* Actions */}
              {isDraft && (
                <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-earth-200 dark:border-basanite-700">
                  {editing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={busy}
                        className="bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white text-xs font-medium px-4 py-2 transition-colors disabled:opacity-60"
                      >
                        {busy ? 'Saving…' : 'Save plan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDraft(null); setError('') }}
                        disabled={busy}
                        className="border border-earth-300 dark:border-basanite-700 text-basanite-600 dark:text-earth-300 text-xs font-medium px-4 py-2 hover:bg-earth-50 dark:hover:bg-basanite-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => plan && setDraft(structuredClone(plan))}
                        className="border border-earth-300 dark:border-basanite-700 text-basanite-600 dark:text-earth-300 text-xs font-medium px-4 py-2 hover:bg-earth-50 dark:hover:bg-basanite-700 transition-colors"
                      >
                        Edit plan
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={generating}
                        className="border border-earth-300 dark:border-basanite-700 text-basanite-600 dark:text-earth-300 text-xs font-medium px-4 py-2 hover:bg-earth-50 dark:hover:bg-basanite-700 transition-colors disabled:opacity-60"
                      >
                        {generating ? 'Regenerating…' : 'Regenerate'}
                      </button>
                    </>
                  )}
                  <p className="text-xs text-basanite-400 dark:text-earth-500 ml-auto">
                    The plan locks when the role goes live.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function updateDim(plan: Plan, index: number, patch: Partial<DimensionPlan>): Plan {
  return {
    ...plan,
    dimension_plans: plan.dimension_plans.map((d, i) => (i === index ? { ...d, ...patch } : d)),
  }
}

function PlanSection({
  label,
  value,
  editing,
  onChange,
  compact = false,
}: {
  label: string
  value: string
  editing: boolean
  onChange: (v: string) => void
  compact?: boolean
}) {
  return (
    <div className={compact ? 'mb-3' : 'mb-5'}>
      <p className="text-xs text-basanite-400 dark:text-earth-500 uppercase tracking-wide mb-1">{label}</p>
      {editing ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={compact ? 2 : 3}
          className="w-full border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 px-3 py-2 text-sm text-basanite-900 dark:text-earth-100 focus:outline-none focus:border-gold-500"
        />
      ) : (
        <p className="text-sm text-basanite-700 dark:text-earth-200 leading-relaxed whitespace-pre-line">{value || '—'}</p>
      )}
    </div>
  )
}
