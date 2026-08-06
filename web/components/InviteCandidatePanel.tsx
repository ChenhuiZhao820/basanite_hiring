'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CopyButton } from '@/components/CopyButton'

type Props = {
  roleId: string
}

type InviteResult = {
  invite_url: string
  invite_sent: boolean
  candidate_email: string
}

// Shown on live roles, alongside the shareable application link. Lets the
// hirer invite a specific candidate by email: the backend mints a pending
// assessment with a unique invite token and emails the candidate their
// personal interview link. The link is also surfaced here for manual
// sharing (LinkedIn DM etc.).
export function InviteCandidatePanel({ roleId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<InviteResult | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch(`/api/roles/${roleId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_name: name.trim(), candidate_email: email.trim() }),
      })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Failed to send invite')
      setResult({
        invite_url: data.invite_url,
        invite_sent: Boolean(data.invite_sent),
        candidate_email: data.candidate_email ?? email.trim(),
      })
      setName('')
      setEmail('')
      // Refresh so the new pending row appears in the candidate queue.
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border border-gold-500/30 bg-gold-500/5 p-5 mb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-basanite-600 dark:text-earth-300 font-medium uppercase tracking-wide mb-1">Invite Candidate</p>
          <p className="text-xs text-basanite-400 dark:text-earth-500">
            Email a specific candidate their personal interview link. They&apos;ll sign in, see the interview in their portal, and start when ready.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => { setOpen(true); setResult(null); setError('') }}
            className="shrink-0 bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white text-xs font-medium px-5 py-2.5 transition-colors"
          >
            Invite by email
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={handleInvite} className="mt-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Candidate name"
            required
            maxLength={200}
            className="flex-1 text-sm text-basanite-800 dark:text-earth-100 bg-white dark:bg-basanite-800 border border-earth-200 dark:border-basanite-700 px-3 py-2 placeholder:text-basanite-300 dark:placeholder:text-earth-600 focus:outline-none focus:border-gold-500"
          />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="candidate@email.com"
            required
            maxLength={320}
            className="flex-1 text-sm text-basanite-800 dark:text-earth-100 bg-white dark:bg-basanite-800 border border-earth-200 dark:border-basanite-700 px-3 py-2 placeholder:text-basanite-300 dark:placeholder:text-earth-600 focus:outline-none focus:border-gold-500"
          />
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => { setOpen(false); setError('') }}
              disabled={busy}
              className="border border-earth-300 dark:border-basanite-700 text-basanite-600 dark:text-earth-300 text-xs font-medium px-4 py-2.5 hover:bg-earth-50 dark:hover:bg-basanite-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white text-xs font-medium px-5 py-2.5 transition-colors disabled:opacity-60"
            >
              {busy ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

      {result && (
        <div className="mt-4 border-t border-gold-500/20 pt-4">
          <p className="text-xs text-green-700 dark:text-green-500 mb-2">
            {result.invite_sent
              ? `Invite emailed to ${result.candidate_email}.`
              : `Invite created for ${result.candidate_email} — the email couldn't be sent, so share the link below directly.`}
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-sm text-basanite-800 dark:text-earth-100 bg-white dark:bg-basanite-800 border border-earth-200 dark:border-basanite-700 px-3 py-2 font-mono truncate">
              {result.invite_url}
            </code>
            <CopyButton text={result.invite_url} />
          </div>
          <p className="text-xs text-basanite-400 dark:text-earth-500 mt-2">
            This link is unique to this candidate — only the invited email address can use it.
          </p>
        </div>
      )}
    </div>
  )
}
