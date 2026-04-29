'use client'

import { forwardRef } from 'react'

type Props = {
  phase: 'idle' | 'live' | 'ending' | 'done' | 'error'
  label?: string
}

// Left pane in the Meet-style layout. Hosts the candidate's webcam fully
// filling the pane, with a small label + REC dot in the bottom-left corner.
const SelfPane = forwardRef<HTMLVideoElement, Props>(function SelfPane(
  { phase, label = 'You' },
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

      <div className="absolute bottom-3 left-3 flex items-center gap-2 text-earth-100 text-xs sm:text-sm">
        {phase === 'live' && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"
            aria-label="Recording"
            title="Recording"
          />
        )}
        <span className="font-medium drop-shadow-sm">{label}</span>
      </div>
    </div>
  )
})

export default SelfPane
