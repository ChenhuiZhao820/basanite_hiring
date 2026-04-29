'use client'

import { LogoMark } from '@/components/Logo'
import EndButton from '@/components/EndButton'

type Phase = 'idle' | 'live' | 'ending' | 'done' | 'error'

type Props = {
  title: string
  phase: Phase
  elapsedSeconds: number
  onEnd: () => void
}

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function InterviewHeader({ title, phase, elapsedSeconds, onEnd }: Props) {
  return (
    <header className="flex-shrink-0 h-14 px-4 sm:px-6 flex items-center justify-between border-b border-earth-200/10 bg-basanite-950/80 backdrop-blur-sm relative z-10">
      <div className="flex items-center gap-2">
        <LogoMark size={22} />
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 flex items-baseline gap-3 text-earth-100">
        <span className="font-display text-base sm:text-lg whitespace-nowrap">{title}</span>
        {phase === 'live' && (
          <span className="font-mono text-[11px] text-earth-200/40 hidden sm:inline">
            {formatElapsed(elapsedSeconds)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <EndButton onClick={onEnd} visible={phase === 'live'} />
      </div>
    </header>
  )
}
