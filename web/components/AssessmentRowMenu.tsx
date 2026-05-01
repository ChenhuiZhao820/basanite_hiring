'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  roleId: string
  assessmentId: string
  candidateLabel: string
}

export function AssessmentRowMenu({ roleId, assessmentId, candidateLabel }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setConfirming(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        setConfirming(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function stop(e: React.SyntheticEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  async function handleDelete(e: React.MouseEvent) {
    stop(e)
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/roles/${roleId}/assessment/${assessmentId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail || data?.error || 'Delete failed')
      }
      setOpen(false)
      setConfirming(false)
      router.refresh()
    } catch (err: any) {
      setError(err?.message ?? 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          stop(e)
          setOpen((v) => !v)
          setConfirming(false)
          setError(null)
        }}
        className="flex items-center justify-center w-7 h-7 text-basanite-400 dark:text-earth-500 hover:text-basanite-900 dark:hover:text-earth-100 hover:bg-earth-100 dark:hover:bg-basanite-800 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          onClick={stop}
          className="absolute right-0 top-8 z-20 min-w-[220px] border border-earth-200 dark:border-basanite-800 bg-white dark:bg-basanite-900 shadow-lg"
        >
          {!confirming ? (
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                stop(e)
                setConfirming(true)
              }}
              className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete assessment
            </button>
          ) : (
            <div className="p-3">
              <p className="text-xs text-basanite-700 dark:text-earth-200 mb-2">
                Delete assessment for <span className="font-medium">{candidateLabel}</span>? This removes scores, reports, transcript, and recording.
              </p>
              {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={(e) => {
                    stop(e)
                    setConfirming(false)
                  }}
                  disabled={deleting}
                  className="text-xs px-3 py-1.5 border border-earth-300 dark:border-basanite-700 text-basanite-600 dark:text-earth-300 hover:bg-earth-50 dark:hover:bg-basanite-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
