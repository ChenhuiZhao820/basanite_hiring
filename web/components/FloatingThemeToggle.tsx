'use client'

import { usePathname } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'

// Fixed-position theme toggle for the candidate-screening pages. Hides itself
// on the interview route — that screen has its own header which mounts the
// toggle inline, so we don't want a duplicate floating one over the bubble.
export default function FloatingThemeToggle() {
  const path = usePathname() ?? ''
  const onInterview = /\/assess\/[^/]+\/interview$/.test(path)
  if (onInterview) return null
  return (
    <div className="fixed top-4 right-4 z-50 sm:top-5 sm:right-5">
      <ThemeToggle />
    </div>
  )
}
