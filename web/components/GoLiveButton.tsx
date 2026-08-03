'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  roleId: string
  hasPlan: boolean
  dimensionsCount: number
}

// Reason keys mirror _NO_DIMENSIONS_REASONS in api.py.
const NO_DIMENSIONS_REASONS = [
  { key: 'general_screen', label: 'I only need a general conversational screen for this role' },
  { key: 'dimensions_dont_fit', label: "The available dimensions don't fit what I want to evaluate" },
  { key: 'just_testing', label: "I'm just trying out the platform" },
  { key: 'other', label: 'Other' },
] as const

// Shown on draft roles only. Going live locks the interview plan and
// activates the assessment link, so we ask for a one-click confirmation.
// Roles with zero dimensions can still go live, but we ask why the hirer
// skipped them first — that feedback shapes the dimension set.
export function GoLiveButton({ roleId, hasPlan, dimensionsCount }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reason, setReason] = useState<string | null>(null)
  const [details, setDetails] = useState('')

  const needsFeedback = dimensionsCount === 0

  async function handleGoLive() {
    if (needsFeedback && !reason) {
      setError('Please pick a reason before going live.')
      return
    }
    setError('')
    setBusy(true)
    try {
      const res = await fetch(`/api/roles/${roleId}/go-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          needsFeedback
            ? {
                no_dimensions_reason: reason,
                no_dimensions_details: reason === 'other' ? details.trim() || null : null,
              }
            : {},
        ),
      })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Failed to go live')
      setConfirming(false)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border border-gold-500/30 bg-gold-500/5 p-5 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs text-basanite-600 dark:text-earth-300 font-medium uppercase tracking-wide mb-1">Draft role</p>
          <p className="text-xs text-basanite-400 dark:text-earth-500">
            {needsFeedback
              ? 'No evaluation dimensions are selected — the interview will run as a general conversational screen without dimension scores.'
              : hasPlan
                ? 'Review the interview plan below, then go live to get your application link. The plan locks once live.'
                : 'Generate and review the interview plan below before going live.'}
          </p>
        </div>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="shrink-0 bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white text-xs font-medium px-5 py-2.5 transition-colors"
          >
            Go live
          </button>
        ) : !needsFeedback ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="border border-earth-300 dark:border-basanite-700 text-basanite-600 dark:text-earth-300 text-xs font-medium px-4 py-2.5 hover:bg-earth-50 dark:hover:bg-basanite-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGoLive}
              disabled={busy}
              className="bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white text-xs font-medium px-5 py-2.5 transition-colors disabled:opacity-60"
            >
              {busy ? 'Going live…' : 'Confirm — lock plan & go live'}
            </button>
          </div>
        ) : null}
      </div>

      {/* Zero-dimension feedback: ask why before confirming go-live. */}
      {confirming && needsFeedback && (
        <div className="mt-4 border-t border-gold-500/20 pt-4">
          <p className="text-sm text-basanite-800 dark:text-earth-100 font-medium mb-1">
            Before you go live — mind telling us why you skipped the dimensions?
          </p>
          <p className="text-xs text-basanite-400 dark:text-earth-500 mb-3">
            Dimension scores are how Basanite grounds its reports, so this helps us understand what's missing.
          </p>
          <div className="space-y-2 mb-3">
            {NO_DIMENSIONS_REASONS.map(r => (
              <label
                key={r.key}
                className={`flex items-center gap-2.5 border px-3 py-2.5 cursor-pointer transition-colors ${
                  reason === r.key
                    ? 'border-gold-500 bg-gold-500/5'
                    : 'border-earth-200 dark:border-basanite-700 hover:border-earth-300 dark:hover:border-basanite-500'
                }`}
              >
                <input
                  type="radio"
                  name="no-dimensions-reason"
                  value={r.key}
                  checked={reason === r.key}
                  onChange={() => setReason(r.key)}
                  className="accent-gold-600"
                />
                <span className="text-sm text-basanite-800 dark:text-earth-100">{r.label}</span>
              </label>
            ))}
          </div>
          {reason === 'other' && (
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Tell us more (optional)"
              className="w-full border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 placeholder-basanite-400 dark:placeholder-earth-500 px-3 py-2.5 text-sm text-basanite-900 dark:text-earth-100 outline-none focus:border-gold-500 transition-colors resize-y mb-3"
            />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setConfirming(false); setError('') }}
              disabled={busy}
              className="border border-earth-300 dark:border-basanite-700 text-basanite-600 dark:text-earth-300 text-xs font-medium px-4 py-2.5 hover:bg-earth-50 dark:hover:bg-basanite-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGoLive}
              disabled={busy || !reason}
              className="bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white text-xs font-medium px-5 py-2.5 transition-colors disabled:opacity-60"
            >
              {busy ? 'Going live…' : 'Confirm — go live without dimensions'}
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
