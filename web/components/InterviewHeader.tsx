'use client'

import { LogoMark } from '@/components/Logo'
import EndButton from '@/components/EndButton'
import ThemeToggle from '@/components/ThemeToggle'

type Phase = 'idle' | 'live' | 'ending' | 'done' | 'error'
type CallStatus = 'connecting' | 'agent-speaking' | 'user-speaking' | 'listening'

type Props = {
  title: string
  phase: Phase
  elapsedSeconds: number
  onEnd: () => void
  /** Live conversation state — drives the small badge next to the logo. */
  callStatus?: CallStatus
}

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function StatusBadge({ status }: { status: CallStatus }) {
  // Colour + label per state. The "listening" state is the one the candidate
  // explicitly asked for so they know the system is waiting on them.
  const map: Record<CallStatus, { label: string; dot: string; text: string }> = {
    'connecting':     { label: 'Connecting',  dot: 'bg-earth-200/50',  text: 'text-earth-200/70' },
    'agent-speaking': { label: 'Baz speaking', dot: 'bg-gold-400 animate-pulse', text: 'text-gold-300' },
    'user-speaking':  { label: 'You speaking',  dot: 'bg-emerald-400 animate-pulse', text: 'text-emerald-300' },
    'listening':      { label: 'Listening',    dot: 'bg-earth-200/70 animate-pulse', text: 'text-earth-200/80' },
  }
  const v = map[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-earth-200/15 bg-basanite-900/40"
      aria-live="polite"
      aria-label={`Status: ${v.label}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
      <span className={`text-[10px] uppercase tracking-widest ${v.text}`}>{v.label}</span>
    </span>
  )
}

export default function InterviewHeader({
  title,
  phase,
  elapsedSeconds,
  onEnd,
  callStatus,
}: Props) {
  const showBadge = (phase === 'live' || phase === 'idle') && callStatus
  return (
    <header className="flex-shrink-0 h-14 px-4 sm:px-6 flex items-center justify-between border-b border-earth-200/10 bg-basanite-950/80 backdrop-blur-sm relative z-10">
      <div className="flex items-center gap-3">
        <LogoMark size={22} />
        {showBadge && callStatus && <StatusBadge status={callStatus} />}
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
        <ThemeToggle />
        <EndButton onClick={onEnd} visible={phase === 'live'} />
      </div>
    </header>
  )
}
