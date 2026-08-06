'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

type WaitlistEntry = {
  id: string
  name: string
  email: string
  company: string | null
  phone: string | null
  referral_source: string | null
  persona: string | null
  status: string
  created_at: string
  approved_at: string | null
}

const PERSONA_LABELS: Record<string, string> = {
  hirer: 'Hires',
  interviewer: 'Interviews',
  candidate: 'Candidate',
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '\u2014'
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminWaitlistPage() {
  useDocumentTitle('Waitlist')
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [linking, setLinking] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  // Single-use sign-in link surface. Shown in a small inline panel
  // so the admin can copy it and paste into Telegram / Signal / SMS
  // when Supabase's email gets junked by the recipient's provider.
  const [generatedLink, setGeneratedLink] = useState<{ email: string; url: string; mode: 'invite' | 'magic_link' } | null>(null)

  useEffect(() => {
    fetch('/api/admin/waitlist')
      .then(r => r.json())
      .then(data => { setEntries(data.entries ?? []); setLoading(false) })
      .catch(() => { setError('Failed to load waitlist.'); setLoading(false) })
  }, [])

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(''), 3500)
  }

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
      setEntries(prev => prev.map(e =>
        e.id === entry.id ? { ...e, status: 'approved', approved_at: new Date().toISOString() } : e,
      ))
      flash(`Invite emailed to ${entry.email}.`)
    }
    setApproving(null)
  }

  // Shared by "Reject" (pending) and "Remove" (approved): both delete the
  // waitlist row. Removing an approved entry does NOT revoke the person's
  // account access — it only clears them from this list.
  async function remove(entry: WaitlistEntry, verb: string) {
    if (!confirm(`${verb} ${entry.email} from the waitlist?`)) return
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

  async function generateLink(entry: WaitlistEntry) {
    setLinking(entry.id)
    setError('')
    const res = await fetch('/api/admin/generate-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: entry.email }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to generate link.')
    } else {
      const mode = data.mode === 'invite' ? 'invite' : 'magic_link'
      const label = mode === 'invite' ? 'Invite' : 'Sign-in'
      setGeneratedLink({ email: entry.email, url: data.action_link, mode })
      // Best-effort copy. clipboard.writeText is gated on a user gesture;
      // since this fires from a click handler, it will normally succeed.
      try {
        await navigator.clipboard.writeText(data.action_link)
        flash(`${label} link for ${entry.email} copied to clipboard.`)
      } catch {
        flash(`${label} link generated; copy from the panel below.`)
      }
    }
    setLinking(null)
  }

  const pending = entries.filter(e => e.status === 'pending')
  const approved = entries.filter(e => e.status === 'approved')

  function EntryDetails({ entry }: { entry: WaitlistEntry }) {
    return (
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-[#0b1f3d] dark:text-earth-100 truncate">{entry.name}</span>
          {entry.persona && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-earth-400 bg-slate-100 dark:bg-basanite-900 border border-slate-200 dark:border-basanite-700 px-1.5 py-0.5">
              {PERSONA_LABELS[entry.persona] ?? entry.persona}
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 dark:text-earth-400 truncate">
          {entry.email}
          {entry.company ? ` \u00b7 ${entry.company}` : ''}
          {entry.phone ? ` \u00b7 ${entry.phone}` : ''}
        </div>
        {entry.referral_source && (
          <div className="text-[10px] text-slate-400 dark:text-earth-500 mt-0.5">
            Heard via {entry.referral_source}
          </div>
        )}
        <div className="text-[10px] text-slate-400 dark:text-earth-500 mt-0.5">
          Joined {formatDateTime(entry.created_at)}
          {entry.status === 'approved' && ` \u00b7 Approved ${formatDateTime(entry.approved_at)}`}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <Link href="/dashboard/admin" className="text-xs text-slate-400 dark:text-earth-500 hover:text-[#0b1f3d] dark:text-earth-100 transition-colors mb-2 inline-block">
        &larr; Back to admin
      </Link>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0b1f3d] dark:text-earth-100 mb-1">Waitlist</h1>
          <p className="text-slate-500 dark:text-earth-400 text-sm">
            Approve requests to send an invite email, or copy a sign-in link when an invite doesn&rsquo;t land.
          </p>
        </div>
        {/* Plain anchor: the route streams text/csv with a Content-Disposition
            attachment header, so the browser downloads it directly. */}
        <a
          href="/api/admin/waitlist?format=csv"
          className="shrink-0 text-xs font-medium px-3 py-2 border border-slate-200 dark:border-basanite-700 text-slate-600 dark:text-earth-300 hover:border-[#1d4ed8] hover:text-[#1d4ed8] transition-colors"
        >
          Export CSV
        </a>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 mb-6">{error}</p>
      )}

      {toast && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 mb-6">{toast}</p>
      )}

      {generatedLink && (
        <section className="border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-500/40 p-4 mb-10">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
              {generatedLink.mode === 'invite' ? 'Invite link' : 'Sign-in link'} for {generatedLink.email}
            </p>
            <button
              onClick={() => setGeneratedLink(null)}
              className="text-xs text-amber-700 hover:underline"
            >
              Dismiss
            </button>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-200 mb-2">
            Single use, expires in ~1 hour.
            {generatedLink.mode === 'invite'
              ? ' The recipient uses this to create their account and set a password.'
              : ' Send via Telegram, Signal, SMS, or any out-of-band channel.'}
          </p>
          <textarea
            readOnly
            value={generatedLink.url}
            onClick={e => (e.currentTarget as HTMLTextAreaElement).select()}
            className="w-full text-[11px] font-mono bg-white dark:bg-basanite-900 border border-amber-200 dark:border-amber-500/30 p-2 break-all resize-none"
            rows={3}
          />
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(generatedLink.url)
                flash('Copied.')
              } catch {
                flash('Could not copy; select and copy manually.')
              }
            }}
            className="mt-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium px-3 py-1.5 transition-colors"
          >
            Copy link
          </button>
        </section>
      )}

      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-earth-500 mb-3">Pending</h2>
      {loading ? (
        <p className="text-slate-400 dark:text-earth-500 text-sm">Loading&hellip;</p>
      ) : pending.length === 0 ? (
        <p className="text-slate-400 dark:text-earth-500 text-sm mb-10">No pending requests.</p>
      ) : (
        <div className="border border-slate-200 dark:border-basanite-700 divide-y divide-slate-100 dark:divide-basanite-700 mb-10">
          {pending.map(entry => (
            <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-4 bg-white dark:bg-basanite-800">
              <EntryDetails entry={entry} />
              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => remove(entry, 'Reject')}
                  disabled={rejecting === entry.id || approving === entry.id}
                  className="text-slate-500 dark:text-earth-400 hover:text-red-600 text-xs font-medium px-3 py-2 border border-slate-200 dark:border-basanite-700 hover:border-red-200 transition-colors disabled:opacity-50"
                >
                  {rejecting === entry.id ? 'Deleting\u2026' : 'Reject'}
                </button>
                <button
                  onClick={() => approve(entry)}
                  disabled={approving === entry.id || rejecting === entry.id}
                  className="bg-[#0b1f3d] hover:bg-[#1d4ed8] dark:bg-[#1d4ed8] dark:hover:bg-[#3b82f6] text-white text-xs font-medium px-4 py-2 transition-colors disabled:opacity-50"
                >
                  {approving === entry.id ? 'Sending\u2026' : 'Approve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-earth-500 mb-3">Approved</h2>
      {loading ? (
        <p className="text-slate-400 dark:text-earth-500 text-sm">Loading&hellip;</p>
      ) : approved.length === 0 ? (
        <p className="text-slate-400 dark:text-earth-500 text-sm">No approved entries yet.</p>
      ) : (
        <div className="border border-slate-200 dark:border-basanite-700 divide-y divide-slate-100 dark:divide-basanite-700">
          {approved.map(entry => (
            <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3 bg-white dark:bg-basanite-800">
              <EntryDetails entry={entry} />
              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => generateLink(entry)}
                  disabled={linking === entry.id}
                  title="Generate a fresh single-use sign-in link to send via another channel"
                  className="text-[11px] text-slate-600 dark:text-earth-300 hover:text-[#0b1f3d] dark:hover:text-earth-100 font-medium px-3 py-1.5 border border-slate-200 dark:border-basanite-700 hover:border-slate-400 transition-colors disabled:opacity-50"
                >
                  {linking === entry.id ? 'Generating\u2026' : 'Copy sign-in link'}
                </button>
                <button
                  onClick={() => remove(entry, 'Remove')}
                  disabled={rejecting === entry.id}
                  title="Removes the entry from this list; does not revoke the person's account"
                  className="text-[11px] text-slate-500 dark:text-earth-400 hover:text-red-600 font-medium px-3 py-1.5 border border-slate-200 dark:border-basanite-700 hover:border-red-200 transition-colors disabled:opacity-50"
                >
                  {rejecting === entry.id ? 'Removing\u2026' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
