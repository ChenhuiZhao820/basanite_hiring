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

type LinkedInCredential = {
  slot: 1 | 2
  linkedin_name: string | null
  updated_at: string
}

const SLOT_LABELS: Record<1 | 2, { title: string; desc: string }> = {
  1: { title: 'Account 1', desc: 'Tech / Finance / Software searches' },
  2: { title: 'Account 2', desc: 'Opticians / Dental / Non-tech searches' },
}

function LinkedInSlotForm({ slot, credential, onSaved }: {
  slot: 1 | 2
  credential: LinkedInCredential | undefined
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const [liAt, setLiAt] = useState('')
  const [jsessionid, setJsessionid] = useState('')
  const [accountName, setAccountName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState('')
  const [savedName, setSavedName] = useState('')

  async function remove() {
    if (!confirm(`Remove credentials for ${SLOT_LABELS[slot].title}?`)) return
    setDeleting(true)
    const res = await fetch('/api/admin/linkedin-token', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot }),
    })
    if (res.ok) { setSavedName(''); onSaved() }
    setDeleting(false)
  }

  async function save() {
    setSaving(true); setErr(''); setSavedName('')
    const res = await fetch('/api/admin/linkedin-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ li_at: liAt.trim(), jsessionid: jsessionid.trim(), slot, name: accountName.trim() || undefined }),
    })
    const data = await res.json()
    if (!res.ok) {
      setErr(data.error ?? 'Failed to save.')
    } else {
      setSavedName(data.name)
      setLiAt(''); setJsessionid(''); setAccountName('')
      setOpen(false)
      onSaved()
    }
    setSaving(false)
  }

  const { title, desc } = SLOT_LABELS[slot]

  return (
    <div className="border border-slate-200 bg-white">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">{title}</div>
          <div className="text-xs text-slate-400">{desc}</div>
          {credential ? (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm font-medium text-[#0b1f3d]">{credential.linkedin_name ?? '—'}</span>
              <span className="text-xs text-slate-400">
                updated {new Date(credential.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          ) : (
            <div className="text-sm text-slate-400 mt-1 italic">No credentials saved</div>
          )}
          {savedName && <p className="text-xs text-green-700 mt-1">Saved {savedName}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {credential && !open && (
            <button
              onClick={remove}
              disabled={deleting}
              className="text-xs text-red-500 hover:underline disabled:opacity-50"
            >
              {deleting ? 'Removing…' : 'Remove'}
            </button>
          )}
          <button
            onClick={() => { setOpen(o => !o); setErr('') }}
            className="text-xs text-[#1d4ed8] hover:underline"
          >
            {open ? 'Cancel' : credential ? 'Update' : 'Add'}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-3 bg-slate-50">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">li_at</label>
            <textarea
              value={liAt}
              onChange={e => setLiAt(e.target.value)}
              rows={2}
              className="w-full text-xs font-mono border border-slate-200 bg-white px-3 py-2 outline-none focus:border-slate-400 resize-none"
              placeholder="AQEDATTUjQw..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">JSESSIONID</label>
            <input
              type="text"
              value={jsessionid}
              onChange={e => setJsessionid(e.target.value)}
              className="w-full text-xs font-mono border border-slate-200 bg-white px-3 py-2 outline-none focus:border-slate-400"
              placeholder="ajax:1234567890123456789"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Account name</label>
            <input
              type="text"
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              className="w-full text-xs border border-slate-200 bg-white px-3 py-2 outline-none focus:border-slate-400"
              placeholder="e.g. Amelia Springfield"
            />
          </div>
          {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">{err}</p>}
          <button
            onClick={save}
            disabled={saving || !liAt || !jsessionid || !accountName.trim()}
            className="bg-[#0b1f3d] hover:bg-[#1d4ed8] text-white text-xs font-medium px-4 py-2 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : `Save to ${title}`}
          </button>
        </div>
      )}
    </div>
  )
}

function LinkedInTokenSection() {
  const [credentials, setCredentials] = useState<LinkedInCredential[]>([])

  function reload() {
    fetch('/api/admin/linkedin-token')
      .then(r => r.json())
      .then(d => setCredentials(d.credentials ?? []))
  }

  useEffect(reload, [])

  return (
    <div className="mb-12">
      <h2 className="font-display text-lg font-bold text-[#0b1f3d] mb-1">LinkedIn Credentials</h2>
      <p className="text-slate-500 text-sm mb-4">
        Each account is used for a specific search type. Paste cookies from DevTools → Application → Cookies on linkedin.com. <strong>Log out of LinkedIn in your browser after saving</strong> — the server takes over the session.
      </p>
      <div className="space-y-px">
        {([1, 2] as const).map(slot => (
          <LinkedInSlotForm
            key={slot}
            slot={slot}
            credential={credentials.find(c => c.slot === slot)}
            onSaved={reload}
          />
        ))}
      </div>
    </div>
  )
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
      <LinkedInTokenSection />

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
