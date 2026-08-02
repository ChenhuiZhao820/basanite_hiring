'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

type SecurityEvent = {
  id: string
  user_id: string
  user_email: string | null
  kind: string
  severity: 'info' | 'strike' | 'suspension'
  detail: {
    filename?: string
    evidence?: string[]
    regex_markers?: string[]
    injection_risk?: string
    action?: string
    strikes?: number
    by?: string
  }
  created_at: string
}

type SuspendedUser = {
  id: string
  email: string
  suspended_at: string | null
  suspended_reason: string | null
}

const KIND_LABELS: Record<string, string> = {
  jd_injection_attempt: 'JD injection attempt',
  admin_suspend: 'Suspended by admin',
  admin_reinstate: 'Reinstated by admin',
}

const SEVERITY_STYLES: Record<string, string> = {
  info: 'bg-slate-100 text-slate-600 dark:bg-basanite-700 dark:text-earth-300',
  strike: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  suspension: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
}

export default function AdminSecurityPage() {
  useDocumentTitle('Security')
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [suspended, setSuspended] = useState<SuspendedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acting, setActing] = useState<string | null>(null)

  function load() {
    fetch('/api/admin/security')
      .then(r => r.json())
      .then(data => {
        setEvents(data.events ?? [])
        setSuspended(data.suspended ?? [])
        setLoading(false)
      })
      .catch(() => { setError('Failed to load security events.'); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  async function act(userId: string, action: 'suspend' | 'reinstate') {
    setError('')
    setActing(userId)
    try {
      const res = await fetch('/api/admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? `Failed to ${action}.`)
      } else {
        load()
      }
    } finally {
      setActing(null)
    }
  }

  const suspendedIds = new Set(suspended.map(u => u.id))

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <Link href="/dashboard/admin" className="text-xs text-slate-400 dark:text-earth-500 hover:text-[#0b1f3d] dark:hover:text-earth-100 transition-colors mb-2 inline-block">
        &larr; Back to admin
      </Link>
      <h1 className="font-display text-3xl font-bold text-[#0b1f3d] dark:text-earth-100 mb-1">Security</h1>
      <p className="text-slate-500 dark:text-earth-400 text-sm mb-8">
        Prompt-injection attempts on JD uploads, and account suspensions. Strike 1 blocks the upload; a second corroborated attempt within 30 days suspends automatically.
      </p>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 mb-6">{error}</p>
      )}

      {/* Currently suspended accounts */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-earth-500 mb-3">
          Suspended accounts {!loading && `(${suspended.length})`}
        </h2>
        {loading ? (
          <p className="text-sm text-slate-400 dark:text-earth-500">Loading&hellip;</p>
        ) : suspended.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-earth-500">No suspended accounts.</p>
        ) : (
          <ul className="space-y-2">
            {suspended.map(u => (
              <li key={u.id} className="border border-slate-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-[#0b1f3d] dark:text-earth-100 font-medium">{u.email || u.id}</p>
                  <p className="text-xs text-slate-500 dark:text-earth-400 mt-0.5">
                    {u.suspended_reason ?? 'No reason recorded'}
                    {u.suspended_at && ` · ${new Date(u.suspended_at).toLocaleString('en-GB')}`}
                  </p>
                </div>
                <button
                  onClick={() => act(u.id, 'reinstate')}
                  disabled={acting === u.id}
                  className="text-xs font-medium border border-slate-300 dark:border-basanite-600 px-3 py-1.5 text-[#0b1f3d] dark:text-earth-100 hover:border-[#1d4ed8] transition-colors disabled:opacity-60"
                >
                  {acting === u.id ? 'Working\u2026' : 'Reinstate'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Event log */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-earth-500 mb-3">
          Event log {!loading && `(${events.length})`}
        </h2>
        {loading ? (
          <p className="text-sm text-slate-400 dark:text-earth-500">Loading&hellip;</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-earth-500">No security events recorded.</p>
        ) : (
          <ul className="space-y-2">
            {events.map(e => (
              <li key={e.id} className="border border-slate-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 ${SEVERITY_STYLES[e.severity] ?? SEVERITY_STYLES.info}`}>
                      {e.severity}
                    </span>
                    <span className="text-sm text-[#0b1f3d] dark:text-earth-100 font-medium">
                      {KIND_LABELS[e.kind] ?? e.kind}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-earth-500">
                    {new Date(e.created_at).toLocaleString('en-GB')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-earth-400 mt-1.5">
                  {e.user_email || e.user_id}
                  {e.detail?.filename && ` · ${e.detail.filename}`}
                  {e.detail?.action === 'allowed' && ' · allowed through (sub-punitive)'}
                </p>
                {(e.detail?.evidence?.length ?? 0) > 0 && (
                  <div className="mt-2 space-y-1">
                    {e.detail.evidence!.map((q, i) => (
                      <p key={i} className="text-xs text-slate-600 dark:text-earth-300 bg-slate-50 dark:bg-basanite-900 border-l-2 border-amber-400 px-2 py-1 font-mono">
                        &ldquo;{q}&rdquo;
                      </p>
                    ))}
                  </div>
                )}
                {e.severity !== 'info' && !suspendedIds.has(e.user_id) && (
                  <button
                    onClick={() => act(e.user_id, 'suspend')}
                    disabled={acting === e.user_id}
                    className="mt-3 text-xs font-medium border border-red-300 dark:border-red-500/40 px-3 py-1.5 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-60"
                  >
                    {acting === e.user_id ? 'Working\u2026' : 'Suspend account'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
