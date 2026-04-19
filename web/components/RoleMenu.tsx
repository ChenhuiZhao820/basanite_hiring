'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  roleId: string
  roleTitle: string
}

export function RoleMenu({ roleId, roleTitle }: Props) {
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

  async function handleDelete() {
    setDeleting(true)
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
      setDeleting(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Role actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v)
          setConfirming(false)
          setError(null)
        }}
        className="flex items-center justify-center w-8 h-8 text-basanite-400 hover:text-basanite-900 hover:bg-earth-100 transition-colors"
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
          className="absolute right-0 top-10 z-20 min-w-[260px] border border-earth-200 bg-white shadow-lg"
        >
          {!confirming ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => setConfirming(true)}
              className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete role
            </button>
          ) : (
            <div className="p-3">
              <p className="text-xs text-basanite-700 mb-2">
                Delete <span className="font-medium">{roleTitle}</span>? This removes all candidates, scores, reports, transcripts, and recordings for this role.
              </p>
              {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                  className="text-xs px-3 py-1.5 border border-earth-300 text-basanite-600 hover:bg-earth-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  {deleting ? 'Deleting…' : 'Delete role'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
