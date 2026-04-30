'use client'

import { useTheme } from '@/lib/theme'

type Props = {
  /** Extra classes for positioning (e.g. fixed top-right vs inline). */
  className?: string
}

// Two-state toggle. Sun glyph in dark mode (clicking goes back to light),
// crescent glyph in light mode (clicking goes to dark). Inline SVG so we
// don't pull in an icon library.
export default function ThemeToggle({ className = '' }: Props) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme'

  return (
    <button
      onClick={toggle}
      type="button"
      aria-label={label}
      title={label}
      className={
        'inline-flex items-center justify-center w-9 h-9 rounded-full ' +
        'border border-basanite-200/30 bg-white/60 text-basanite-700 ' +
        'hover:border-gold-500/60 hover:text-basanite-900 ' +
        'dark:border-earth-200/15 dark:bg-basanite-900/60 dark:text-earth-200 ' +
        'dark:hover:border-gold-500/60 dark:hover:text-earth-100 ' +
        'transition-colors duration-150 backdrop-blur-sm ' +
        className
      }
    >
      {isDark ? (
        // Sun
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // Crescent moon
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}
