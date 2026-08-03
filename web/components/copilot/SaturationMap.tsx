'use client'

import { formatDimensionKey } from '@/lib/format'

type Props = {
  dimensions: string[]
  saturation: Record<string, string>
}

const LEVELS: Record<string, { label: string; dot: string; text: string }> = {
  none: { label: 'No evidence', dot: 'bg-earth-300 dark:bg-basanite-600', text: 'text-basanite-400 dark:text-earth-500' },
  partial: { label: 'Partial', dot: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-500' },
  saturated: { label: 'Saturated', dot: 'bg-green-600', text: 'text-green-700 dark:text-green-500' },
}

// One row per active dimension. No numbers — evidence saturation only;
// scores unlock at wrap-up.
export function SaturationMap({ dimensions, saturation }: Props) {
  return (
    <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-4">
      <p className="text-xs text-basanite-400 dark:text-earth-500 uppercase tracking-wide mb-3">Evidence saturation</p>
      <div className="space-y-2">
        {dimensions.map((d) => {
          const level = LEVELS[saturation[d] ?? 'none'] ?? LEVELS.none
          return (
            <div key={d} className="flex items-center justify-between gap-3">
              <span className="text-sm text-basanite-800 dark:text-earth-100 truncate">{formatDimensionKey(d)}</span>
              <span className={`flex items-center gap-1.5 text-xs shrink-0 ${level.text}`}>
                <span className={`w-2 h-2 rounded-full ${level.dot}`} />
                {level.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
