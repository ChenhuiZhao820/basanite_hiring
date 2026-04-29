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
}

// Right pane in the Meet-style layout. Hosts the X-pattern background and the
// audio-reactive bubble, both scoped to this pane's bounds. Bottom-left chip
// names the agent ("Baz" by default).
export default function AgentPane({ getFft, phase, label = 'Baz' }: Props) {
  return (
    <div className="relative overflow-hidden min-w-0 min-h-0 bg-basanite-950">
      <InterviewBackground />
      <AgentBubble getFft={getFft} phase={phase} />

      <div className="absolute bottom-3 left-3 z-10 text-earth-100 text-xs sm:text-sm pointer-events-none">
        <span className="font-medium drop-shadow-sm">{label}</span>
      </div>
    </div>
  )
}
