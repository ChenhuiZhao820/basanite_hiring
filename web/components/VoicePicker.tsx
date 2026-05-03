'use client'

import { useEffect, useRef, useState } from 'react'
import { VOICES, type Voice } from '@/lib/voices'

type Props = {
  /** Selected voice ID, or null/undefined for "use system default". */
  value: string | null | undefined
  onChange: (voiceId: string | null) => void
  /** When true, the "System default" card is hidden (e.g. on edit-mode where
   *  you've already explicitly chosen). Defaults to showing it. */
  requireExplicit?: boolean
}

/**
 * Voice picker — single-audio playback.
 *
 * Renders one card per catalogue voice plus an optional "System default"
 * card. Click a card body to select it; click the play button to preview.
 * Selection and preview are independent — you can play voice A while
 * keeping voice B as your saved selection. Only one preview plays at a
 * time; clicking a different play button stops the current preview and
 * starts the new one.
 *
 * The cards are styled to mirror the active-speaker ring used in
 * VoiceInterview (gold inset shadow) so the dashboard and the live
 * candidate experience feel like the same product.
 */
export function VoicePicker({ value, onChange, requireExplicit = false }: Props) {
  // ID of the voice currently playing (null = nothing playing). Audio
  // element is shared across cards so we don't start more than one.
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // One <audio> element shared across the picker. Created lazily on
    // first interaction to avoid the "browser blocked autoplay" warning
    // on initial render.
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  function togglePreview(voice: Voice) {
    if (playingId === voice.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.addEventListener('ended', () => setPlayingId(null))
      audioRef.current.addEventListener('error', () => setPlayingId(null))
    }
    audioRef.current.src = voice.sampleUrl
    audioRef.current.currentTime = 0
    void audioRef.current.play().catch(() => setPlayingId(null))
    setPlayingId(voice.id)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {!requireExplicit && (
        <SystemDefaultCard selected={!value} onClick={() => onChange(null)} />
      )}
      {VOICES.map(v => (
        <VoiceCard
          key={v.id}
          voice={v}
          selected={value === v.id}
          playing={playingId === v.id}
          onSelect={() => onChange(v.id)}
          onTogglePreview={() => togglePreview(v)}
        />
      ))}
    </div>
  )
}

function VoiceCard({
  voice,
  selected,
  playing,
  onSelect,
  onTogglePreview,
}: {
  voice: Voice
  selected: boolean
  playing: boolean
  onSelect: () => void
  onTogglePreview: () => void
}) {
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
      className={
        'border bg-white dark:bg-basanite-800 p-4 cursor-pointer transition-colors ' +
        (selected
          ? 'border-gold-500 shadow-[inset_0_0_0_1px_rgba(196,154,47,0.6)]'
          : 'border-earth-200 dark:border-basanite-700 hover:border-earth-300 dark:hover:border-basanite-700')
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-basanite-900 dark:text-earth-100 text-sm truncate">{voice.name}</h3>
            <span className="text-[10px] uppercase tracking-wide text-basanite-500 dark:text-earth-400 font-medium">
              {voice.accent}
            </span>
            <span className="text-[10px] text-basanite-400 dark:text-earth-500">·</span>
            <span className="text-[10px] uppercase tracking-wide text-basanite-500 dark:text-earth-400 font-medium">
              {voice.gender}
            </span>
          </div>
          <p className="text-xs text-basanite-500 dark:text-earth-400">{voice.description}</p>
        </div>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onTogglePreview() }}
          aria-label={playing ? `Pause ${voice.name} preview` : `Play ${voice.name} preview`}
          className={
            'shrink-0 inline-flex items-center justify-center w-8 h-8 transition-colors ' +
            (playing
              ? 'bg-gold-500 text-white hover:bg-gold-400'
              : 'bg-earth-100 dark:bg-basanite-700 text-basanite-700 dark:text-earth-200 hover:bg-earth-200 dark:hover:bg-basanite-700/80')
          }
        >
          {playing ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
      </div>
    </div>
  )
}

function SystemDefaultCard({ selected, onClick }: { selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className={
        'border bg-white dark:bg-basanite-800 p-4 cursor-pointer transition-colors ' +
        (selected
          ? 'border-gold-500 shadow-[inset_0_0_0_1px_rgba(196,154,47,0.6)]'
          : 'border-earth-200 dark:border-basanite-700 hover:border-earth-300 dark:hover:border-basanite-700')
      }
    >
      <h3 className="font-medium text-basanite-900 dark:text-earth-100 text-sm">System default</h3>
      <p className="text-xs text-basanite-500 dark:text-earth-400 mt-1">
        Use the platform&rsquo;s default interviewer voice. Pick a specific voice from the options to override.
      </p>
    </div>
  )
}
