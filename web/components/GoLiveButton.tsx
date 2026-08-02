'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  roleId: string
  hasPlan: boolean
}

// Shown on draft roles only. Going live locks the interview plan and
// activates the assessment link, so we ask for a one-click confirmation.
export function GoLiveButton({ roleId, hasPlan }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleGoLive() {
    setError('')
    setBusy(true)
    try {
      const res = await fetch(`/api/roles/${roleId}/go-live`, { method: 'POST' })
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
            {hasPlan
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
        ) : (
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
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
