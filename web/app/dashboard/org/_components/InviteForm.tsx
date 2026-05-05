'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Invitation = {
  id: string
  email: string
  role: string
  expires_at: string
  created_at: string
}

export function InviteForm({ orgId, pendingInvitations }: { orgId: string; pendingInvitations: Invitation[] }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'member' | 'admin'>('member')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/orgs/${encodeURIComponent(orgId)}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail ?? `Failed (${res.status})`)
      }
      setEmail('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to invite')
    } finally {
      setBusy(false)
    }
  }

  async function cancel(invitationId: string) {
    setCancellingId(invitationId)
    setError('')
    try {
      const res = await fetch(`/api/orgs/${encodeURIComponent(orgId)}/invitations/${encodeURIComponent(invitationId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail ?? `Failed (${res.status})`)
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-basanite-600 dark:text-earth-300 mb-1.5 uppercase tracking-wide">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="teammate@yourcompany.com"
            className="w-full border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 placeholder-basanite-400 dark:placeholder-earth-500 px-4 py-2.5 text-sm text-basanite-900 dark:text-earth-100 outline-none focus:border-gold-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-basanite-600 dark:text-earth-300 mb-1.5 uppercase tracking-wide">Role</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as 'member' | 'admin')}
            className="border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 text-basanite-900 dark:text-earth-100 px-3 py-2.5 text-sm focus:outline-none focus:border-gold-500"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="px-5 py-2.5 bg-basanite-900 dark:bg-gold-600 text-white text-sm font-medium hover:bg-gold-600 dark:hover:bg-gold-500 transition-colors disabled:opacity-40"
        >
          {busy ? 'Sending…' : 'Send invite'}
        </button>
      </form>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {pendingInvitations.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-wider font-medium text-basanite-500 dark:text-earth-400 mb-2">Pending invitations</h3>
          <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 divide-y divide-earth-200 dark:divide-basanite-700">
            {pendingInvitations.map(inv => (
              <div key={inv.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-basanite-900 dark:text-earth-100 truncate">{inv.email}</p>
                  <p className="text-[10px] uppercase tracking-wide text-basanite-400 dark:text-earth-500 mt-0.5">
                    {inv.role} · expires {new Date(inv.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => cancel(inv.id)}
                  disabled={cancellingId === inv.id}
                  className="text-xs text-basanite-500 dark:text-earth-400 hover:text-red-600 border border-earth-200 dark:border-basanite-700 hover:border-red-300 px-3 py-1.5 transition-colors disabled:opacity-60"
                >
                  {cancellingId === inv.id ? 'Cancelling…' : 'Cancel'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
