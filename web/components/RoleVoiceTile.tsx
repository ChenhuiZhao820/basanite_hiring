'use client'

// Inline edit affordance for a role's interviewer voice. Lives in the
// role config summary grid on /dashboard/roles/[id]. Click to open a
// modal with the same VoicePicker the wizard uses; pick + Save PATCHes
// /api/roles/{id} and triggers a router refresh so the tile shows the
// new value without a hard reload.

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { findVoice } from '@/lib/voices'
import { VoicePicker } from './VoicePicker'

type Props = {
  roleId: string
  initialVoiceId: string | null
}

export function RoleVoiceTile({ roleId, initialVoiceId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string | null>(initialVoiceId)
  const [committed, setCommitted] = useState<string | null>(initialVoiceId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const currentVoice = findVoice(committed)
  const display = currentVoice
    ? `${currentVoice.name} · ${currentVoice.accent} ${currentVoice.gender.toLowerCase()}`
    : 'System default'

  function openModal() {
    setDraft(committed)
    setError('')
    setOpen(true)
  }

  async function save() {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/roles/${roleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewer_voice_id: draft }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || data?.detail || 'Save failed')
      }
      setCommitted(draft)
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-4 text-left w-full hover:border-earth-300 dark:hover:border-basanite-700/80 transition-colors"
      >
        <p className="text-xs text-basanite-400 dark:text-earth-500 uppercase tracking-wide mb-1">
          Interviewer voice
        </p>
        <p className="text-sm text-basanite-900 dark:text-earth-100 truncate">{display}</p>
        <p className="text-[10px] text-basanite-400 dark:text-earth-500 mt-1 uppercase tracking-wide">Click to change</p>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-basanite-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !saving && setOpen(false)}
        >
          <div
            className="bg-white dark:bg-basanite-900 border border-earth-200 dark:border-basanite-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-earth-200 dark:border-basanite-700 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl text-basanite-900 dark:text-earth-100 mb-1">
                  Interviewer voice
                </h2>
                <p className="text-xs text-basanite-500 dark:text-earth-400">
                  Pick the voice candidates will hear. Changes apply to all future assessments — in-flight interviews keep their original voice.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                disabled={saving}
                aria-label="Close"
                className="text-basanite-500 dark:text-earth-400 hover:text-basanite-900 dark:hover:text-earth-100 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-5">
              <VoicePicker value={draft} onChange={setDraft} />
            </div>

            {error && (
              <p className="px-6 py-2 text-xs text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="px-6 py-4 border-t border-earth-200 dark:border-basanite-700 flex items-center justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={saving}
                className="text-xs text-basanite-600 dark:text-earth-300 hover:text-basanite-900 dark:hover:text-earth-100 px-4 py-2 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || draft === committed}
                className="text-xs bg-basanite-900 dark:bg-gold-600 text-white px-4 py-2 hover:bg-gold-600 dark:hover:bg-gold-500 transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save voice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
