'use client'

import { formatDimensionKey } from '@/lib/format'

export type Probe = {
  dimension: string
  technique: string
  text: string
  reason: string
}

type Props = {
  probe: Probe | null
  onAction: (action: 'asked' | 'adapted' | 'dismissed') => void
}

// One suggested probe at a time, phrased and ready to ask. The interviewer
// may ask it, adapt it, or ignore it — every response is logged as tuning
// signal (the uptake-rate metric).
export function ProbeCard({ probe, onAction }: Props) {
  return (
    <div className="border border-gold-500/40 bg-gold-500/5 p-4">
      <p className="text-xs text-gold-600 uppercase tracking-wide mb-2">Suggested probe</p>
      {!probe ? (
        <p className="text-sm text-basanite-400 dark:text-earth-500">Listening — nothing to suggest right now.</p>
      ) : (
        <>
          <p className="text-sm text-basanite-900 dark:text-earth-100 mb-1.5">&ldquo;{probe.text}&rdquo;</p>
          <p className="text-xs text-basanite-500 dark:text-earth-400 mb-3">
            {probe.reason}
            {probe.dimension ? ` · ${formatDimensionKey(probe.dimension)}` : ''}
            {probe.technique ? ` · ${probe.technique}` : ''}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAction('asked')}
              className="bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white text-xs font-medium px-3 py-1.5 transition-colors"
            >
              Asked
            </button>
            <button
              type="button"
              onClick={() => onAction('adapted')}
              className="border border-earth-300 dark:border-basanite-700 text-basanite-600 dark:text-earth-300 text-xs font-medium px-3 py-1.5 hover:bg-earth-50 dark:hover:bg-basanite-700 transition-colors"
            >
              Adapted it
            </button>
            <button
              type="button"
              onClick={() => onAction('dismissed')}
              className="text-basanite-400 dark:text-earth-500 text-xs px-2 py-1.5 hover:text-basanite-600 dark:hover:text-earth-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </>
      )}
    </div>
  )
}
