'use client'

// Workspace switcher dropdown. Lives in the dashboard top bar, left of
// the brand link. Shows the active org's name; click to expand a list
// of every org the user belongs to. Switching POSTs /api/orgs/active
// then hard-reloads so server components re-resolve the new active org.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type Org = {
  id: string
  name: string
  description: string | null
  role: string
}

export function WorkspaceSwitcher() {
  const [orgs, setOrgs] = useState<Org[] | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      fetch('/api/orgs', { cache: 'no-store' }).then(r => r.ok ? r.json() : { orgs: [] }),
      fetch('/api/orgs/active', { cache: 'no-store' }).then(r => r.ok ? r.json() : { active_org_id: null }),
    ]).then(([orgsResp, activeResp]) => {
      if (cancelled) return
      setOrgs((orgsResp?.orgs ?? []) as Org[])
      setActiveId(activeResp?.active_org_id ?? null)
    }).catch(() => {
      if (!cancelled) setOrgs([])
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const active = orgs?.find(o => o.id === activeId) ?? orgs?.[0] ?? null
  const label = active?.name ?? '…'

  async function switchTo(orgId: string) {
    if (busy || orgId === activeId) { setOpen(false); return }
    setBusy(true)
    try {
      const res = await fetch('/api/orgs/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      })
      if (!res.ok) throw new Error(await res.text())
      // Hard reload so every server component re-resolves the new active org.
      window.location.reload()
    } catch {
      setBusy(false)
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 text-sm text-basanite-700 dark:text-earth-200 hover:text-basanite-900 dark:hover:text-earth-100 px-2 py-1 transition-colors max-w-[200px]"
        title={active?.description ?? undefined}
      >
        <span className="truncate font-medium">{label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && orgs && (
        <div role="menu" className="absolute left-0 top-9 z-30 min-w-[260px] border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 shadow-lg">
          <div className="py-1 max-h-72 overflow-y-auto">
            {orgs.length === 0 ? (
              <p className="text-xs text-basanite-500 dark:text-earth-400 px-4 py-3">No organisations yet.</p>
            ) : (
              orgs.map(o => (
                <button
                  key={o.id}
                  type="button"
                  role="menuitem"
                  onClick={() => switchTo(o.id)}
                  disabled={busy}
                  className={
                    'w-full text-left px-4 py-2 text-xs transition-colors disabled:opacity-60 ' +
                    (o.id === activeId
                      ? 'bg-earth-50 dark:bg-basanite-700 text-basanite-900 dark:text-earth-100 font-medium'
                      : 'text-basanite-700 dark:text-earth-200 hover:bg-earth-50 dark:hover:bg-basanite-700')
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{o.name}</span>
                    <span className="text-[10px] uppercase tracking-wide text-basanite-400 dark:text-earth-500 shrink-0">{o.role}</span>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-earth-200 dark:border-basanite-700 py-1">
            <Link
              href="/dashboard/org"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-xs text-basanite-700 dark:text-earth-200 hover:bg-earth-50 dark:hover:bg-basanite-700 transition-colors"
            >
              Organisation settings
            </Link>
            <Link
              href="/dashboard/org/new"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-xs text-basanite-700 dark:text-earth-200 hover:bg-earth-50 dark:hover:bg-basanite-700 transition-colors"
            >
              + Create organisation
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
