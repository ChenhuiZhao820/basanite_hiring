'use client'

type Props = {
  flags: string[]
}

// Quiet, non-blocking observations — never accusations. Empty state renders
// nothing louder than a dash so the interviewer's eyes stay on the candidate.
export function AuthenticityFlags({ flags }: Props) {
  return (
    <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-4">
      <p className="text-xs text-basanite-400 dark:text-earth-500 uppercase tracking-wide mb-2">Authenticity notes</p>
      {flags.length === 0 ? (
        <p className="text-xs text-basanite-300 dark:text-earth-600">—</p>
      ) : (
        <ul className="space-y-1.5">
          {flags.map((f, i) => (
            <li key={i} className="text-xs text-basanite-600 dark:text-earth-300 flex gap-2">
              <span className="text-gold-600 shrink-0">·</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
