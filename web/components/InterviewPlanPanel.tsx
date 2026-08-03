'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDimensionKey } from '@/lib/format'
import { ALL_DIMENSIONS, MIN_DIMENSIONS } from '@/lib/dimensions'

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
  initialDimensions: string[]
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

export function InterviewPlanPanel({ roleId, status, initialPlan, planEditedAt, initialDimensions }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(status === 'draft')
  const [plan, setPlan] = useState<Plan | null>(() => normalisePlan(initialPlan))
  const [draft, setDraft] = useState<Plan | null>(null) // non-null while editing plan text
  const [busy, setBusy] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [edited, setEdited] = useState(Boolean(planEditedAt))
  // Per-dimension expand/collapse (keyed by index into dimension_plans).
  const [openDims, setOpenDims] = useState<Set<number>>(new Set())
  // Dimensions on the role; dimDraft is non-null while the dimension editor is open.
  const [dims, setDims] = useState<string[]>(initialDimensions)
  const [dimDraft, setDimDraft] = useState<string[] | null>(null)
  const [savingDims, setSavingDims] = useState(false)

  const isDraft = status === 'draft'
  const editing = draft !== null

  function toggleDim(i: number) {
    setOpenDims(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  async function handleGenerate() {
    setError('')
    setGenerating(true)
    try {
      const res = await fetch(`/api/roles/${roleId}/generate-plan`, { method: 'POST' })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Plan generation failed')
      const next = normalisePlan(data.interview_plan)
      setPlan(next)
      setDraft(null)
      setEdited(false)
      setOpenDims(new Set())
      router.refresh()
      return next
    } catch (e: any) {
      setError(e.message)
      return null
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

  function startEditingPlan() {
    if (!plan) return
    setDraft(structuredClone(plan))
    // Open every dimension so all textareas are reachable while editing.
    setOpenDims(new Set(plan.dimension_plans.map((_, i) => i)))
  }

  async function handleSaveDimensions() {
    if (!dimDraft) return
    if (dimDraft.length < MIN_DIMENSIONS) {
      setError(`Select at least ${MIN_DIMENSIONS} dimensions.`)
      return
    }
    setError('')
    setSavingDims(true)
    try {
      const res = await fetch(`/api/roles/${roleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dimensions: dimDraft }),
      })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Failed to update dimensions')
      setDims(dimDraft)
      setDimDraft(null)
      setDraft(null)
      // The plan is per-dimension, so a dimension change regenerates it.
      await handleGenerate()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSavingDims(false)
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

          {/* Dimensions — editable while draft; changing them regenerates the plan */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-basanite-400 dark:text-earth-500 uppercase tracking-wide">Dimensions</p>
              {isDraft && dimDraft === null && (
                <button
                  type="button"
                  onClick={() => { setDimDraft([...dims]); setError('') }}
                  disabled={generating || savingDims || busy}
                  className="text-xs text-basanite-500 dark:text-earth-400 hover:text-gold-600 transition-colors disabled:opacity-60"
                >
                  Add / remove dimensions
                </button>
              )}
            </div>
            {dimDraft === null ? (
              <div className="flex flex-wrap gap-1.5">
                {dims.map(d => (
                  <span key={d} className="text-xs bg-earth-100 dark:bg-basanite-900 text-basanite-600 dark:text-earth-300 px-2 py-1">
                    {formatDimensionKey(d)}
                  </span>
                ))}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {ALL_DIMENSIONS.map(d => {
                    const selected = dimDraft.includes(d.key)
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() =>
                          setDimDraft(prev =>
                            prev === null
                              ? prev
                              : selected
                                ? prev.filter(k => k !== d.key)
                                : [...prev, d.key],
                          )
                        }
                        className={`text-left border px-3 py-2 transition-colors ${
                          selected
                            ? 'border-gold-500 bg-gold-500/5'
                            : 'border-earth-200 dark:border-basanite-700 hover:border-earth-400 dark:hover:border-basanite-500'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm text-basanite-900 dark:text-earth-100">{d.name}</span>
                          {selected && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c49a2f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </span>
                        <span className="block text-xs text-basanite-500 dark:text-earth-400 mt-0.5">{d.description}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveDimensions}
                    disabled={savingDims || generating || dimDraft.length < MIN_DIMENSIONS}
                    className="bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white text-xs font-medium px-4 py-2 transition-colors disabled:opacity-60"
                  >
                    {savingDims || generating ? 'Saving & regenerating plan…' : `Save ${dimDraft.length} dimensions`}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDimDraft(null); setError('') }}
                    disabled={savingDims || generating}
                    className="border border-earth-300 dark:border-basanite-700 text-basanite-600 dark:text-earth-300 text-xs font-medium px-4 py-2 hover:bg-earth-50 dark:hover:bg-basanite-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <p className="text-xs text-basanite-400 dark:text-earth-500">
                    Saving regenerates the interview plan — manual plan edits will be lost.
                  </p>
                </div>
              </div>
            )}
          </div>

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

              {view.dimension_plans.map((dp, i) => {
                const open = openDims.has(i)
                return (
                  <div key={`${dp.dimension}-${i}`} className="mb-3 border-l-2 border-gold-500/40 pl-4">
                    <button
                      type="button"
                      onClick={() => toggleDim(i)}
                      aria-expanded={open}
                      className="w-full flex items-center justify-between py-1 text-left group"
                    >
                      <span className="text-sm font-medium text-basanite-900 dark:text-earth-100 group-hover:text-gold-600 transition-colors">
                        {formatDimensionKey(dp.dimension)}
                      </span>
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className={`text-basanite-400 dark:text-earth-500 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {open && (
                      <div className="mt-2">
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
                    )}
                  </div>
                )
              })}

              <div className="mt-5">
                <PlanSection
                  label="Closing"
                  value={view.closing_approach}
                  editing={editing}
                  onChange={v => setDraft(d => d && { ...d, closing_approach: v })}
                />
              </div>

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
                        onClick={startEditingPlan}
                        disabled={dimDraft !== null || generating}
                        className="border border-earth-300 dark:border-basanite-700 text-basanite-600 dark:text-earth-300 text-xs font-medium px-4 py-2 hover:bg-earth-50 dark:hover:bg-basanite-700 transition-colors disabled:opacity-60"
                      >
                        Edit plan
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={generating || dimDraft !== null}
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
