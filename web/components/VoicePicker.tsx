'use client'

import { useEffect, useRef, useState } from 'react'
import { VOICES, type Voice } from '@/lib/voices'

// Shape of an org_custom_voices row as returned by /api/voices/custom.
// We adapt these into the same Voice type the picker already understands
// so a single VoiceCard component renders both kinds.
type CustomVoiceRow = {
  id: string
  eleven_voice_id: string
  name: string
  description: string | null
  sample_url: string | null
}

function adaptCustomToVoice(row: CustomVoiceRow): Voice & { custom?: true } {
  return {
    id: row.eleven_voice_id,
    name: row.name,
    accent: 'British',          // accent/gender are display-only on the cards;
    gender: 'Female',           // for cloned voices we don't actually know either,
    description: row.description ?? 'Cloned by your team',
    sampleUrl: row.sample_url ?? '',
    custom: true,
  } as Voice & { custom?: true }
}

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
  // Cloned voices owned by the calling user's org. Loaded from
  // /api/voices/custom on mount; null while pending so we can render an
  // empty section instead of a flash of "no team voices yet".
  const [customVoices, setCustomVoices] = useState<Voice[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/voices/custom', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { voices: [] }))
      .then(data => {
        if (cancelled) return
        const rows = (data?.voices ?? []) as CustomVoiceRow[]
        setCustomVoices(rows.map(adaptCustomToVoice))
      })
      .catch(() => { if (!cancelled) setCustomVoices([]) })
    return () => { cancelled = true }
  }, [])

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

  const hasCustom = (customVoices?.length ?? 0) > 0

  return (
    <div className="space-y-5">
      {!requireExplicit && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SystemDefaultCard selected={!value} onClick={() => onChange(null)} />
        </div>
      )}

      {hasCustom && (
        <section>
          <h4 className="text-[10px] uppercase tracking-wider font-medium text-basanite-500 dark:text-earth-400 mb-2">
            Your team&rsquo;s voices
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(customVoices ?? []).map(v => (
              <VoiceCard
                key={v.id}
                voice={v}
                selected={value === v.id}
                playing={playingId === v.id}
                onSelect={() => onChange(v.id)}
                onTogglePreview={() => togglePreview(v)}
                isCustom
              />
            ))}
          </div>
        </section>
      )}

      <section>
        {hasCustom && (
          <h4 className="text-[10px] uppercase tracking-wider font-medium text-basanite-500 dark:text-earth-400 mb-2">
            Curated voices
          </h4>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      </section>
    </div>
  )
}

function VoiceCard({
  voice,
  selected,
  playing,
  onSelect,
  onTogglePreview,
  isCustom,
}: {
  voice: Voice
  selected: boolean
  playing: boolean
  onSelect: () => void
  onTogglePreview: () => void
  isCustom?: boolean
}) {
  const hasPreview = !!voice.sampleUrl
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
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-medium text-basanite-900 dark:text-earth-100 text-sm truncate">{voice.name}</h3>
            {isCustom ? (
              <span className="text-[10px] uppercase tracking-wide text-gold-600 dark:text-gold-400 font-medium">
                Cloned
              </span>
            ) : (
              <>
                <span className="text-[10px] uppercase tracking-wide text-basanite-500 dark:text-earth-400 font-medium">
                  {voice.accent}
                </span>
                <span className="text-[10px] text-basanite-400 dark:text-earth-500">·</span>
                <span className="text-[10px] uppercase tracking-wide text-basanite-500 dark:text-earth-400 font-medium">
                  {voice.gender}
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-basanite-500 dark:text-earth-400">{voice.description}</p>
        </div>
        {hasPreview && (
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
        )}
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
