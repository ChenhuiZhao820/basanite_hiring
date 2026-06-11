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

type IssueReport = {
  id: string
  category: string
  message: string
  page: string | null
  status: string
  created_at: string
  token: string | null
  assessments: {
    candidate_name: string | null
    candidate_email: string | null
    roles: { title: string | null; company_name: string | null } | null
  } | null
}

const ISSUE_CATEGORY_LABELS: Record<string, string> = {
  audio_mic: "Microphone not working",
  cant_hear: "Can't hear interviewer",
  no_response: 'Interviewer not responding',
  frozen: 'Page froze or crashed',
  connection: 'Connection dropping',
  other: 'Something else',
}

export default function AdminPage() {
  useDocumentTitle('Admin')
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [linking, setLinking] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  // Inline invite form. Lets the admin invite a hirer directly by
  // email without going through the public-waitlist round trip.
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteCompany, setInviteCompany] = useState('')
  const [inviting, setInviting] = useState(false)

  // Single-use sign-in link surface. Shown in a small inline panel
  // so the admin can copy it and paste into Telegram / Signal / SMS
  // when Supabase's email gets junked by the recipient's provider.
  const [generatedLink, setGeneratedLink] = useState<{ email: string; url: string } | null>(null)

  // Candidate-reported interview issues ("Having issues?" button).
  const [issues, setIssues] = useState<IssueReport[]>([])
  const [resolvingIssue, setResolvingIssue] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/waitlist')
      .then(r => r.json())
      .then(data => { setEntries(data.entries ?? []); setLoading(false) })
      .catch(() => { setError('Failed to load waitlist.'); setLoading(false) })
    fetch('/api/admin/issue-reports')
      .then(r => r.json())
      .then(data => setIssues(data.reports ?? []))
      .catch(() => {/* non-fatal: the waitlist is the primary admin surface */})
  }, [])

  async function setIssueStatus(id: string, status: 'new' | 'resolved') {
    setResolvingIssue(id)
    try {
      const res = await fetch('/api/admin/issue-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        setIssues(prev => prev.map(i => i.id === id ? { ...i, status } : i))
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Failed to update report.')
      }
    } finally {
      setResolvingIssue(null)
    }
  }

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(''), 3500)
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInviting(true)
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim() || undefined,
          company: inviteCompany.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to send invite.')
      } else {
        flash(
          data.mode === 'magic_link'
            ? `${inviteEmail} already had an account; sent a fresh sign-in link.`
            : `Invite emailed to ${inviteEmail}.`,
        )
        setInviteEmail('')
        setInviteName('')
        setInviteCompany('')
        // Refresh so the new approved row appears in the list.
        const r2 = await fetch('/api/admin/waitlist')
        const d2 = await r2.json()
        setEntries(d2.entries ?? [])
      }
    } finally {
      setInviting(false)
    }
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
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'approved' } : e))
      flash(`Invite emailed to ${entry.email}.`)
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
      setGeneratedLink({ email: entry.email, url: data.action_link })
      // Best-effort copy. clipboard.writeText is gated on a user gesture;
      // since this fires from a click handler, it will normally succeed.
      try {
        await navigator.clipboard.writeText(data.action_link)
        flash(`Sign-in link for ${entry.email} copied to clipboard.`)
      } catch {
        flash(`Sign-in link generated; copy from the panel below.`)
      }
    }
    setLinking(null)
  }

  const pending = entries.filter(e => e.status === 'pending')
  const approved = entries.filter(e => e.status === 'approved')

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <Link href="/dashboard" className="text-xs text-slate-400 dark:text-earth-500 hover:text-[#0b1f3d] dark:text-earth-100 transition-colors mb-2 inline-block">
        &larr; Back to dashboard
      </Link>
      <h1 className="font-display text-2xl font-bold text-[#0b1f3d] dark:text-earth-100 mb-1">Admin</h1>
      <p className="text-slate-500 dark:text-earth-400 text-sm mb-8">Invite hirers directly, approve waitlist requests, or copy a sign-in link when an invite email doesn't land.</p>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 mb-6">{error}</p>
      )}

      {toast && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 mb-6">{toast}</p>
      )}

      {/* Candidate-reported interview issues. Newest first; open reports
          surface a badge so they're hard to miss during a live cohort. */}
      {(() => {
        const open = issues.filter(i => i.status !== 'resolved')
        return (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-earth-500">
                Interview issue reports
              </h2>
              {open.length > 0 && (
                <span className="text-[10px] font-semibold text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300 rounded-full px-2 py-0.5">
                  {open.length} open
                </span>
              )}
            </div>
            {issues.length === 0 ? (
              <p className="text-slate-400 dark:text-earth-500 text-sm">No issues reported.</p>
            ) : (
              <div className="border border-slate-200 dark:border-basanite-700 divide-y divide-slate-100 dark:divide-basanite-700">
                {issues.map(issue => {
                  const role = issue.assessments?.roles
                  const resolved = issue.status === 'resolved'
                  return (
                    <div key={issue.id} className={`px-5 py-4 bg-white dark:bg-basanite-800 ${resolved ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-[#0b1f3d] dark:text-earth-100">
                              {ISSUE_CATEGORY_LABELS[issue.category] ?? issue.category}
                            </span>
                            {resolved && (
                              <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5">Resolved</span>
                            )}
                          </div>
                          {issue.message && (
                            <p className="text-sm text-slate-600 dark:text-earth-300 whitespace-pre-wrap break-words mb-1">{issue.message}</p>
                          )}
                          <div className="text-xs text-slate-500 dark:text-earth-400 truncate">
                            {issue.assessments?.candidate_name || issue.assessments?.candidate_email || 'Unknown candidate'}
                            {role?.title ? ` · ${role.title}${role.company_name ? ` (${role.company_name})` : ''}` : ''}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-earth-500 mt-0.5">
                            {new Date(issue.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <button
                          onClick={() => setIssueStatus(issue.id, resolved ? 'new' : 'resolved')}
                          disabled={resolvingIssue === issue.id}
                          className="shrink-0 text-xs font-medium px-3 py-1.5 border border-slate-200 dark:border-basanite-700 text-slate-600 dark:text-earth-300 hover:border-slate-400 dark:hover:border-earth-500 transition-colors disabled:opacity-50"
                        >
                          {resolvingIssue === issue.id ? '…' : resolved ? 'Reopen' : 'Mark resolved'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })()}

      {/* Direct-invite form. The single highest-friction admin task
          was Drew having to curl the waitlist API to invite someone
          new; this collapses it to one form. */}
      <section className="border border-slate-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5 mb-10">
        <h2 className="text-sm font-semibold text-[#0b1f3d] dark:text-earth-100 mb-1">Invite a hirer</h2>
        <p className="text-xs text-slate-500 dark:text-earth-400 mb-4">Sends a Supabase invite email immediately. If the email is already registered, sends a fresh magic link instead.</p>
        <form onSubmit={invite} className="grid gap-3 sm:grid-cols-3">
          <input
            type="email"
            placeholder="email@company.com"
            required
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            className="border border-slate-200 dark:border-basanite-700 bg-white dark:bg-basanite-900 px-3 py-2 text-sm text-[#0b1f3d] dark:text-earth-100 outline-none focus:border-[#1d4ed8]"
          />
          <input
            type="text"
            placeholder="Full name (optional)"
            value={inviteName}
            onChange={e => setInviteName(e.target.value)}
            className="border border-slate-200 dark:border-basanite-700 bg-white dark:bg-basanite-900 px-3 py-2 text-sm text-[#0b1f3d] dark:text-earth-100 outline-none focus:border-[#1d4ed8]"
          />
          <input
            type="text"
            placeholder="Company (optional)"
            value={inviteCompany}
            onChange={e => setInviteCompany(e.target.value)}
            className="border border-slate-200 dark:border-basanite-700 bg-white dark:bg-basanite-900 px-3 py-2 text-sm text-[#0b1f3d] dark:text-earth-100 outline-none focus:border-[#1d4ed8]"
          />
          <button
            type="submit"
            disabled={inviting || !inviteEmail.trim()}
            className="sm:col-span-3 sm:justify-self-start bg-[#0b1f3d] hover:bg-[#1d4ed8] dark:bg-[#1d4ed8] dark:hover:bg-[#3b82f6] text-white text-xs font-medium px-4 py-2 transition-colors disabled:opacity-50"
          >
            {inviting ? 'Sending…' : 'Send invite'}
          </button>
        </form>
      </section>

      {generatedLink && (
        <section className="border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-500/40 p-4 mb-10">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-100">Sign-in link for {generatedLink.email}</p>
            <button
              onClick={() => setGeneratedLink(null)}
              className="text-xs text-amber-700 hover:underline"
            >
              Dismiss
            </button>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-200 mb-2">Single use, expires in ~1 hour. Send via Telegram, Signal, SMS, or any out-of-band channel.</p>
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

      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-earth-500 mb-3">Waitlist</h2>
      {loading ? (
        <p className="text-slate-400 dark:text-earth-500 text-sm">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="text-slate-400 dark:text-earth-500 text-sm mb-10">No pending requests.</p>
      ) : (
        <div className="border border-slate-200 dark:border-basanite-700 divide-y divide-slate-100 dark:divide-basanite-700 mb-10">
          {pending.map(entry => (
            <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-4 bg-white dark:bg-basanite-800">
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#0b1f3d] dark:text-earth-100 truncate">{entry.name}</div>
                <div className="text-xs text-slate-500 dark:text-earth-400 truncate">{entry.email}{entry.company ? ` · ${entry.company}` : ''}</div>
                <div className="text-[10px] text-slate-400 dark:text-earth-500 mt-0.5">
                  {new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => reject(entry)}
                  disabled={rejecting === entry.id || approving === entry.id}
                  className="text-slate-500 dark:text-earth-400 hover:text-red-600 text-xs font-medium px-3 py-2 border border-slate-200 dark:border-basanite-700 hover:border-red-200 transition-colors disabled:opacity-50"
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
          <div className="border border-slate-200 dark:border-basanite-700 divide-y divide-slate-100 dark:divide-basanite-700">
            {approved.map(entry => (
              <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3 bg-white dark:bg-basanite-800">
                <div className="min-w-0">
                  <div className="text-sm text-[#0b1f3d] dark:text-earth-100 truncate">{entry.name}</div>
                  <div className="text-xs text-slate-500 dark:text-earth-400 truncate">{entry.email}{entry.company ? ` · ${entry.company}` : ''}</div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => generateLink(entry)}
                    disabled={linking === entry.id}
                    title="Generate a fresh single-use sign-in link to send via another channel"
                    className="text-[11px] text-slate-600 dark:text-earth-300 hover:text-[#0b1f3d] dark:hover:text-earth-100 font-medium px-3 py-1.5 border border-slate-200 dark:border-basanite-700 hover:border-slate-400 transition-colors disabled:opacity-50"
                  >
                    {linking === entry.id ? 'Generating…' : 'Copy sign-in link'}
                  </button>
                  <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5">Invited</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
