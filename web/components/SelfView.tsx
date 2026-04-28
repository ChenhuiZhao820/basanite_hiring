'use client'

import { forwardRef } from 'react'

type Props = {
  phase: 'idle' | 'live' | 'ending' | 'done' | 'error'
}

const SelfView = forwardRef<HTMLVideoElement, Props>(function SelfView({ phase }, ref) {
  return (
    <div className="fixed bottom-6 right-6 z-20 group w-16 h-16 sm:w-[88px] sm:h-[88px]">
      <div className="relative w-full h-full rounded-full overflow-hidden ring-1 ring-gold-500/40 shadow-lg shadow-black/40 transition-transform duration-200 ease-out sm:group-hover:scale-[1.36]">
        <video
          ref={ref}
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1]"
        />
        {phase === 'live' && (
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"
            aria-label="Recording in progress"
            title="Recording in progress"
          />
        )}
      </div>
    </div>
  )
})

export default SelfView
