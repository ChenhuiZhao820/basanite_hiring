'use client'

// One row in the cloned-voices list. Click play to preview, click delete
// to soft-delete. Soft-delete fires an optimistic remove; on failure we
// reload the page so the user sees the actual server state.

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Voice = {
  id: string
  org_id: string
  eleven_voice_id: string
  name: string
  description: string | null
  sample_url: string | null
  created_at: string
}

export function CustomVoiceRow({ voice }: { voice: Voice }) {
  const router = useRouter()
  const [playing, setPlaying] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function togglePreview() {
    if (!voice.sample_url) return
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
      return
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(voice.sample_url)
      audioRef.current.addEventListener('ended', () => setPlaying(false))
      audioRef.current.addEventListener('error', () => setPlaying(false))
    }
    audioRef.current.currentTime = 0
    void audioRef.current.play().catch(() => setPlaying(false))
    setPlaying(true)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/voices/custom/${encodeURIComponent(voice.id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      router.refresh()
    } catch {
      setDeleting(false)
      router.refresh()
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <h3 className="text-sm font-medium text-basanite-900 dark:text-earth-100 truncate">{voice.name}</h3>
          {voice.description && (
            <p className="text-xs text-basanite-500 dark:text-earth-400 truncate">{voice.description}</p>
          )}
        </div>
        <p className="text-[10px] uppercase tracking-wide text-basanite-400 dark:text-earth-500 mt-0.5">
          Cloned {new Date(voice.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          {!voice.sample_url && <span className="ml-2 text-amber-600 dark:text-amber-400">· preview unavailable</span>}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {voice.sample_url && (
          <button
            type="button"
            onClick={togglePreview}
            aria-label={playing ? `Pause ${voice.name} preview` : `Play ${voice.name} preview`}
            className={
              'inline-flex items-center justify-center w-9 h-9 transition-colors ' +
              (playing
                ? 'bg-gold-500 text-white hover:bg-gold-400'
                : 'bg-earth-100 dark:bg-basanite-700 text-basanite-700 dark:text-earth-200 hover:bg-earth-200 dark:hover:bg-basanite-700/80')
            }
          >
            {playing ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
        )}
        {confirming ? (
          <>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="text-xs text-basanite-500 dark:text-earth-400 px-3 py-2 hover:text-basanite-900 dark:hover:text-earth-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs bg-red-600 text-white px-3 py-2 hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {deleting ? 'Deleting…' : 'Confirm delete'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-xs text-basanite-500 dark:text-earth-400 hover:text-red-600 border border-earth-200 dark:border-basanite-700 hover:border-red-300 px-3 py-2 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
