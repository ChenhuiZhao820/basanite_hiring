'use client'

import AgentBubble from '@/components/AgentBubble'
import InterviewBackground from '@/components/InterviewBackground'

type FftSnapshot = {
  freq: Uint8Array | undefined
  volume: number
  isSpeaking: boolean
}

type Phase = 'idle' | 'live' | 'ending' | 'done' | 'error'

type Props = {
  getFft: () => FftSnapshot
  phase: Phase
  label?: string
  /** True while Baz is speaking — drives the active speaker ring. */
  speaking?: boolean
}

// Right pane in the Meet-style layout. Hosts the X-pattern background and the
// audio-reactive bubble, both scoped to this pane's bounds. Bottom-left chip
// names the agent ("Baz" by default). When Baz is speaking, the same gold
// inset ring + label glow as SelfPane appears so the candidate always knows
// whose turn it is.
export default function AgentPane({ getFft, phase, label = 'Baz', speaking = false }: Props) {
  return (
    <div className="relative overflow-hidden min-w-0 min-h-0 bg-basanite-950">
      <InterviewBackground />
      <AgentBubble getFft={getFft} phase={phase} />

      {/* Active-speaker ring. Mirrors SelfPane's treatment for consistency. */}
      <div
        aria-hidden
        className={
          'absolute inset-0 pointer-events-none transition-opacity duration-150 z-10 ' +
          (speaking ? 'opacity-100' : 'opacity-0')
        }
        style={{
          boxShadow:
            'inset 0 0 0 3px rgba(196,154,47,0.85), inset 0 0 36px rgba(196,154,47,0.25)',
        }}
      />

      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 text-earth-100 text-xs sm:text-sm pointer-events-none">
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
}
