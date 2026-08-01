'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

// Only the status is needed here; full entries live on the waitlist page.
type WaitlistEntry = {
  id: string
  status: string
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

function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function AdminPage() {
  useDocumentTitle('Admin')
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [adminName, setAdminName] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  // Inline invite form. Lets the admin invite a hirer directly by
  // email without going through the public-waitlist round trip.
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteCompany, setInviteCompany] = useState('')
  const [inviting, setInviting] = useState(false)

  // Candidate-reported interview issues ("Having issues?" button).
  const [issues, setIssues] = useState<IssueReport[]>([])
  const [resolvingIssue, setResolvingIssue] = useState<string | null>(null)

  useEffect(() => {
    // Greet the admin by first name. Prefer explicit profile names; fall
    // back to the email local-part so the greeting never reads bare.
    createClient().auth.getUser().then(({ data: { user } }) => {
      const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string }
      const raw = (meta.full_name || meta.name || user?.email?.split('@')[0] || '').trim()
      const first = raw.split(/[\s.@_-]+/)[0] || ''
      setAdminName(first ? first[0].toUpperCase() + first.slice(1) : '')
    })
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

  const pending = entries.filter(e => e.status === 'pending')
  const approved = entries.filter(e => e.status === 'approved')
  const openIssues = issues.filter(i => i.status !== 'resolved')

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <Link href="/dashboard" className="text-xs text-slate-400 dark:text-earth-500 hover:text-[#0b1f3d] dark:text-earth-100 transition-colors mb-2 inline-block">
        &larr; Back to dashboard
      </Link>
      <h1 className="font-display text-3xl font-bold text-[#0b1f3d] dark:text-earth-100 mb-1">
        {timeGreeting()}{adminName ? `, ${adminName}` : ''}.
      </h1>
      <p className="text-slate-500 dark:text-earth-400 text-sm mb-8">
        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} &mdash; here&rsquo;s where things stand.
      </p>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 mb-6">{error}</p>
      )}

      {toast && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 mb-6">{toast}</p>
      )}

      {/* At-a-glance cards. The waitlist moved to its own page; these
          keep the counts visible from the landing screen. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Link
          href="/dashboard/admin/waitlist"
          className="group border border-slate-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5 hover:border-[#1d4ed8] transition-colors"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-earth-500 mb-2">Waitlist</p>
          <p className="font-display text-3xl font-bold text-[#0b1f3d] dark:text-earth-100">{loading ? '\u2014' : pending.length}</p>
          <p className="text-xs text-slate-500 dark:text-earth-400 mt-1">
            pending {pending.length === 1 ? 'request' : 'requests'}
            <span className="text-[#1d4ed8] dark:text-[#3b82f6] font-medium ml-1 group-hover:underline">Review &rarr;</span>
          </p>
        </Link>
        <Link
          href="/dashboard/admin/waitlist"
          className="group border border-slate-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5 hover:border-[#1d4ed8] transition-colors"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-earth-500 mb-2">Approved</p>
          <p className="font-display text-3xl font-bold text-[#0b1f3d] dark:text-earth-100">{loading ? '\u2014' : approved.length}</p>
          <p className="text-xs text-slate-500 dark:text-earth-400 mt-1">invited so far</p>
        </Link>
        <a
          href="#issue-reports"
          className="group border border-slate-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5 hover:border-[#1d4ed8] transition-colors"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-earth-500 mb-2">Issue reports</p>
          <p className={`font-display text-3xl font-bold ${openIssues.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-[#0b1f3d] dark:text-earth-100'}`}>{openIssues.length}</p>
          <p className="text-xs text-slate-500 dark:text-earth-400 mt-1">open during interviews</p>
        </a>
        <Link
          href="/dashboard/admin/security"
          className="group border border-slate-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5 hover:border-[#1d4ed8] transition-colors"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-earth-500 mb-2">Security</p>
          <p className="font-display text-3xl font-bold text-[#0b1f3d] dark:text-earth-100">&rarr;</p>
          <p className="text-xs text-slate-500 dark:text-earth-400 mt-1">
            injection attempts &amp; suspensions
            <span className="text-[#1d4ed8] dark:text-[#3b82f6] font-medium ml-1 group-hover:underline">Review &rarr;</span>
          </p>
        </Link>
      </div>

      {/* Candidate-reported interview issues. Newest first; open reports
          surface a badge so they're hard to miss during a live cohort. */}
      {(() => {
        const open = openIssues
        return (
          <section id="issue-reports" className="mb-10">
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
    </div>
  )
}
