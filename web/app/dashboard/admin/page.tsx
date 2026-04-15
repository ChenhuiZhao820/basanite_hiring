'use client'

import { useEffect, useState } from 'react'

type WaitlistEntry = {
  id: string
  name: string
  email: string
  company: string | null
  status: string
  created_at: string
}

export default function AdminPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/waitlist')
      .then(r => r.json())
      .then(data => { setEntries(data.entries ?? []); setLoading(false) })
      .catch(() => { setError('Failed to load waitlist.'); setLoading(false) })
  }, [])

  async function approve(entry: WaitlistEntry) {
    setApproving(entry.id)
    setError('')
    const res = await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id, email: entry.email }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to approve.')
    } else {
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'approved' } : e))
    }
    setApproving(null)
  }

  const pending = entries.filter(e => e.status === 'pending')
  const approved = entries.filter(e => e.status === 'approved')

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <h1 className="font-display text-2xl font-bold text-[#0b1f3d] mb-1">Waitlist</h1>
      <p className="text-slate-500 text-sm mb-8">Approve requests to send an invite email.</p>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 mb-6">{error}</p>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="text-slate-400 text-sm">No pending requests.</p>
      ) : (
        <div className="border border-slate-200 divide-y divide-slate-100 mb-10">
          {pending.map(entry => (
            <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-4 bg-white">
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#0b1f3d] truncate">{entry.name}</div>
                <div className="text-xs text-slate-500 truncate">{entry.email}{entry.company ? ` · ${entry.company}` : ''}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <button
                onClick={() => approve(entry)}
                disabled={approving === entry.id}
                className="shrink-0 bg-[#0b1f3d] hover:bg-[#1d4ed8] text-white text-xs font-medium px-4 py-2 transition-colors disabled:opacity-50"
              >
                {approving === entry.id ? 'Sending…' : 'Approve'}
              </button>
            </div>
          ))}
        </div>
      )}

      {approved.length > 0 && (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Approved</h2>
          <div className="border border-slate-200 divide-y divide-slate-100">
            {approved.map(entry => (
              <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3 bg-white">
                <div className="min-w-0">
                  <div className="text-sm text-[#0b1f3d] truncate">{entry.name}</div>
                  <div className="text-xs text-slate-500 truncate">{entry.email}{entry.company ? ` · ${entry.company}` : ''}</div>
                </div>
                <span className="shrink-0 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5">Invited</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
