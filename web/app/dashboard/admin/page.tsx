'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

type WaitlistEntry = {
  id: string
  name: string
  email: string
  company: string | null
  status: string
  created_at: string
}

export default function AdminPage() {
  useDocumentTitle('Admin')
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
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

  async function reject(entry: WaitlistEntry) {
    if (!confirm(`Delete waitlist request from ${entry.email}?`)) return
    setRejecting(entry.id)
    setError('')
    const res = await fetch('/api/admin/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to delete.')
    } else {
      setEntries(prev => prev.filter(e => e.id !== entry.id))
    }
    setRejecting(null)
  }

  const pending = entries.filter(e => e.status === 'pending')
  const approved = entries.filter(e => e.status === 'approved')

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <Link href="/dashboard" className="text-xs text-slate-400 dark:text-earth-500 hover:text-[#0b1f3d] transition-colors mb-2 inline-block">
        &larr; Back to dashboard
      </Link>
      <h1 className="font-display text-2xl font-bold text-[#0b1f3d] mb-1">Waitlist</h1>
      <p className="text-slate-500 dark:text-earth-400 text-sm mb-8">Approve requests to send an invite email.</p>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 mb-6">{error}</p>
      )}

      {loading ? (
        <p className="text-slate-400 dark:text-earth-500 text-sm">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="text-slate-400 dark:text-earth-500 text-sm">No pending requests.</p>
      ) : (
        <div className="border border-slate-200 dark:border-basanite-800 divide-y divide-slate-100 dark:divide-basanite-800 mb-10">
          {pending.map(entry => (
            <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-4 bg-white dark:bg-basanite-900">
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#0b1f3d] truncate">{entry.name}</div>
                <div className="text-xs text-slate-500 dark:text-earth-400 truncate">{entry.email}{entry.company ? ` · ${entry.company}` : ''}</div>
                <div className="text-[10px] text-slate-400 dark:text-earth-500 mt-0.5">
                  {new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => reject(entry)}
                  disabled={rejecting === entry.id || approving === entry.id}
                  className="text-slate-500 dark:text-earth-400 hover:text-red-600 text-xs font-medium px-3 py-2 border border-slate-200 dark:border-basanite-800 hover:border-red-200 transition-colors disabled:opacity-50"
                >
                  {rejecting === entry.id ? 'Deleting…' : 'Reject'}
                </button>
                <button
                  onClick={() => approve(entry)}
                  disabled={approving === entry.id || rejecting === entry.id}
                  className="bg-[#0b1f3d] hover:bg-[#1d4ed8] dark:bg-[#1d4ed8] dark:hover:bg-[#3b82f6] text-white text-xs font-medium px-4 py-2 transition-colors disabled:opacity-50"
                >
                  {approving === entry.id ? 'Sending…' : 'Approve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {approved.length > 0 && (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-earth-500 mb-3">Approved</h2>
          <div className="border border-slate-200 dark:border-basanite-800 divide-y divide-slate-100 dark:divide-basanite-800">
            {approved.map(entry => (
              <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3 bg-white dark:bg-basanite-900">
                <div className="min-w-0">
                  <div className="text-sm text-[#0b1f3d] truncate">{entry.name}</div>
                  <div className="text-xs text-slate-500 dark:text-earth-400 truncate">{entry.email}{entry.company ? ` · ${entry.company}` : ''}</div>
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
