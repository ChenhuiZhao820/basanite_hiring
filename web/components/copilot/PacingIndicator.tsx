'use client'

type Props = {
  pacing: string
  elapsedSeconds: number
  targetMinutes: number
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Elapsed vs target, plus which open high-weight dimension to prioritise as
// time runs short.
export function PacingIndicator({ pacing, elapsedSeconds, targetMinutes }: Props) {
  const overTime = elapsedSeconds > targetMinutes * 60
  return (
    <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-basanite-400 dark:text-earth-500 uppercase tracking-wide">Pacing</p>
        <p className={`text-xs font-mono ${overTime ? 'text-red-500' : 'text-basanite-600 dark:text-earth-300'}`}>
          {fmt(elapsedSeconds)} / {targetMinutes}:00
        </p>
      </div>
      <p className="text-xs text-basanite-600 dark:text-earth-300">
        {pacing || 'On track.'}
      </p>
    </div>
  )
}
