'use client'

import { LogoMark } from '@/components/Logo'
import EndButton from '@/components/EndButton'
import ThemeToggle from '@/components/ThemeToggle'

type Phase = 'idle' | 'live' | 'ending' | 'done' | 'error'
type CallStatus = 'connecting' | 'agent-speaking' | 'user-speaking' | 'listening' | 'reverting'

type Props = {
  title: string
  phase: Phase
  elapsedSeconds: number
  onEnd: () => void
  /** Discards the candidate's current answer and re-asks the current question. */
  onRedo?: () => void
  /** Live conversation state — drives the prominent centre status pill. */
  callStatus?: CallStatus
}

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function StatusBadge({ status }: { status: CallStatus }) {
  // Prominent, centre-of-header status pill so the candidate can always tell,
  // at a glance, whether Baz is talking or it's their turn to speak.
  const map: Record<CallStatus, { label: string; dot: string; text: string; ring: string }> = {
    'connecting':     { label: 'Connecting\u2026', dot: 'bg-basanite-400 dark:bg-earth-200/50', text: 'text-basanite-600 dark:text-earth-200/80', ring: 'border-basanite-200 dark:border-earth-200/15' },
    'agent-speaking': { label: 'Baz is speaking',  dot: 'bg-gold-500 animate-pulse',           text: 'text-gold-700 dark:text-gold-300',      ring: 'border-gold-400/70 dark:border-gold-500/40' },
    'user-speaking':  { label: "You're speaking",  dot: 'bg-emerald-500 animate-pulse',        text: 'text-emerald-700 dark:text-emerald-300', ring: 'border-emerald-400/70 dark:border-emerald-500/40' },
    'reverting':      { label: 'Reverting \u2014 Baz will re-ask\u2026', dot: 'bg-amber-500 animate-pulse', text: 'text-amber-700 dark:text-amber-300', ring: 'border-amber-400/70 dark:border-amber-500/40' },
    'listening':      { label: 'Listening \u00b7 your turn', dot: 'bg-emerald-500 animate-pulse', text: 'text-emerald-700 dark:text-emerald-300', ring: 'border-emerald-400/70 dark:border-emerald-500/40' },
  }
  const v = map[status]
  return (
    <span
      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border bg-white/70 dark:bg-basanite-900/60 backdrop-blur-sm shadow-sm ${v.ring}`}
      aria-live="polite"
      aria-label={`Status: ${v.label}`}
    >
      <span className={`w-2.5 h-2.5 rounded-full ${v.dot}`} />
      <span className={`text-xs sm:text-sm font-semibold uppercase tracking-widest ${v.text}`}>{v.label}</span>
    </span>
  )
}

export default function InterviewHeader({
  title,
  phase,
  elapsedSeconds,
  onEnd,
  onRedo,
  callStatus,
}: Props) {
  const showBadge = (phase === 'live' || phase === 'idle') && callStatus
  return (
    <header className="flex-shrink-0 h-14 px-4 sm:px-6 flex items-center justify-between border-b border-basanite-200/60 dark:border-earth-200/10 bg-white/80 dark:bg-basanite-950/80 backdrop-blur-sm relative z-10">
      <div className="flex items-center gap-3 min-w-0">
        <LogoMark size={22} />
        <span className="font-display text-sm sm:text-base whitespace-nowrap text-basanite-900 dark:text-earth-100 truncate">{title}</span>
        {phase === 'live' && (
          <span className="font-mono text-[11px] text-basanite-500 dark:text-earth-200/40 hidden sm:inline">
            {formatElapsed(elapsedSeconds)}
          </span>
        )}
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        {showBadge && callStatus && <StatusBadge status={callStatus} />}
      </div>

      <div className="flex items-center gap-2">
        {phase === 'live' && onRedo && (
          <button
            type="button"
            onClick={onRedo}
            title="Discard your current answer and answer this question again"
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full border border-basanite-200/60 dark:border-earth-200/15 bg-white/60 dark:bg-basanite-900/60 text-basanite-700 dark:text-earth-200 hover:border-gold-500/60 hover:text-basanite-900 dark:hover:text-earth-100 transition-colors text-xs font-medium"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            <span className="hidden sm:inline">Redo answer</span>
          </button>
        )}
        <ThemeToggle />
        <EndButton onClick={onEnd} visible={phase === 'live'} />
      </div>
    </header>
  )
}
