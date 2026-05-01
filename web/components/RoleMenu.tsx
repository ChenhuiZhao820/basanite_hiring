'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Status = 'draft' | 'live' | 'paused' | 'closed' | string

type Props = {
  roleId: string
  roleTitle: string
  status: Status
}

// Status transitions we allow from each starting status. The backend already
// rejects assessments against any non-'live' role with 410, so the gating is
// correct regardless of UI; this just keeps the menu honest.
function actionsFor(status: Status): Array<{ key: string; label: string; nextStatus: Status; tone?: 'default' | 'subtle' }> {
  switch (status) {
    case 'live':
      return [
        { key: 'pause', label: 'Pause role', nextStatus: 'paused' },
        { key: 'close', label: 'Close role', nextStatus: 'closed' },
      ]
    case 'paused':
      return [
        { key: 'resume', label: 'Resume role', nextStatus: 'live' },
        { key: 'close', label: 'Close role', nextStatus: 'closed' },
      ]
    case 'closed':
      return [{ key: 'reopen', label: 'Reopen role', nextStatus: 'live' }]
    case 'draft':
      // Drafts go live via the create wizard's go-live step, not from here.
      return []
    default:
      return []
  }
}

export function RoleMenu({ roleId, roleTitle, status }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState<null | 'delete' | { key: string; label: string; nextStatus: Status }>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setConfirming(null)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        setConfirming(null)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function applyStatus(nextStatus: Status) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/roles/${roleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || data?.detail || 'Update failed')
      }
      setOpen(false)
      setConfirming(null)
      router.refresh()
    } catch (err: any) {
      setError(err?.message ?? 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/roles/${roleId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || data?.detail || 'Delete failed')
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err?.message ?? 'Delete failed')
      setBusy(false)
    }
  }

  const actions = actionsFor(status)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Role actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v)
          setConfirming(null)
          setError(null)
        }}
        className="flex items-center justify-center w-8 h-8 text-basanite-400 dark:text-earth-500 hover:text-basanite-900 dark:hover:text-earth-100 hover:bg-earth-100 dark:hover:bg-basanite-800 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-20 min-w-[260px] border border-earth-200 dark:border-basanite-800 bg-white dark:bg-basanite-900 shadow-lg"
        >
          {confirming === null && (
            <div className="py-1">
              {actions.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (a.key === 'pause' || a.key === 'close') {
                      setConfirming(a)
                    } else {
                      void applyStatus(a.nextStatus)
                    }
                  }}
                  disabled={busy}
                  className="w-full text-left px-4 py-2 text-xs text-basanite-700 dark:text-earth-200 hover:bg-earth-50 dark:hover:bg-basanite-800 transition-colors disabled:opacity-60"
                >
                  {a.label}
                </button>
              ))}
              {actions.length > 0 && <div className="border-t border-earth-200 dark:border-basanite-800 my-1" />}
              <button
                type="button"
                role="menuitem"
                onClick={() => setConfirming('delete')}
                disabled={busy}
                className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
              >
                Delete role
              </button>
              {error && <p className="text-xs text-red-600 px-4 py-2">{error}</p>}
            </div>
          )}

          {confirming === 'delete' && (
            <div className="p-3">
              <p className="text-xs text-basanite-700 dark:text-earth-200 mb-2">
                Delete <span className="font-medium">{roleTitle}</span>? This removes all candidates, scores, reports, transcripts, and recordings for this role.
              </p>
              {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  disabled={busy}
                  className="text-xs px-3 py-1.5 border border-earth-300 dark:border-basanite-700 text-basanite-600 dark:text-earth-300 hover:bg-earth-50 dark:hover:bg-basanite-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  className="text-xs px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  {busy ? 'Deleting…' : 'Delete role'}
                </button>
              </div>
            </div>
          )}

          {confirming && typeof confirming === 'object' && (
            <div className="p-3">
              <p className="text-xs text-basanite-700 dark:text-earth-200 mb-2">
                {confirming.key === 'pause' ? (
                  <>Pause <span className="font-medium">{roleTitle}</span>? The assessment link will return &ldquo;not accepting candidates&rdquo;. In-flight assessments keep running. You can resume later.</>
                ) : (
                  <>Close <span className="font-medium">{roleTitle}</span>? Same as pause but signals the role is filled. You can reopen it later.</>
                )}
              </p>
              {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  disabled={busy}
                  className="text-xs px-3 py-1.5 border border-earth-300 dark:border-basanite-700 text-basanite-600 dark:text-earth-300 hover:bg-earth-50 dark:hover:bg-basanite-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => applyStatus(confirming.nextStatus)}
                  disabled={busy}
                  className="text-xs px-3 py-1.5 bg-basanite-900 text-white hover:bg-gold-600 disabled:opacity-60 transition-colors"
                >
                  {busy ? 'Working…' : confirming.label}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
