'use client'

import { forwardRef } from 'react'

type Props = {
  phase: 'idle' | 'live' | 'ending' | 'done' | 'error'
  label?: string
  /** True while the candidate is speaking — drives the active speaker ring. */
  speaking?: boolean
}

// Left pane in the Meet-style layout. Hosts the candidate's webcam fully
// filling the pane, with a small label + REC dot in the bottom-left corner.
// When the candidate is speaking, a gold inset ring + glowing label appear
// to mirror the Google Meet "active speaker" affordance.
const SelfPane = forwardRef<HTMLVideoElement, Props>(function SelfPane(
  { phase, label = 'You', speaking = false },
  ref,
) {
  return (
    <div className="relative bg-basanite-900 overflow-hidden min-w-0 min-h-0">
      <video
        ref={ref}
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
      />
      {/* Subtle vignette so the label/REC chip stays legible over bright frames. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 25%)',
        }}
      />

      {/* Active-speaker ring. Inset so it never affects the pane's outer
          dimensions and never causes layout shift. Soft glow via inner shadow
          so it reads as warmth rather than a hard border. */}
      <div
        aria-hidden
        className={
          'absolute inset-0 pointer-events-none transition-opacity duration-150 ' +
          (speaking ? 'opacity-100' : 'opacity-0')
        }
        style={{
          boxShadow:
            'inset 0 0 0 3px rgba(196,154,47,0.85), inset 0 0 36px rgba(196,154,47,0.25)',
        }}
      />

      <div className="absolute bottom-3 left-3 flex items-center gap-2 text-earth-100 text-xs sm:text-sm">
        {phase === 'live' && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"
            aria-label="Recording"
            title="Recording"
          />
        )}
        <span
          className={
            'font-medium drop-shadow-sm transition-colors ' +
            (speaking ? 'text-gold-400' : 'text-earth-100')
          }
        >
          {label}
        </span>
        {speaking && (
          <span className="ml-1 px-1.5 py-0.5 text-[10px] uppercase tracking-wide font-semibold bg-gold-500/90 text-basanite-950 rounded">
            Speaking
          </span>
        )}
      </div>
    </div>
  )
})

export default SelfPane
