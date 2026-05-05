'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Member = {
  user_id: string
  role: string
  joined_at: string
  email: string | null
  full_name: string | null
}

type Props = {
  orgId: string
  members: Member[]
  viewerUserId: string
  viewerRole: string
}

const ROLE_OPTIONS = ['owner', 'admin', 'member'] as const

export function MembersTable({ orgId, members, viewerUserId, viewerRole }: Props) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function changeRole(memberUserId: string, newRole: string) {
    setBusyId(memberUserId)
    setError('')
    try {
      const res = await fetch(`/api/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(memberUserId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_role: newRole }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail ?? `Failed (${res.status})`)
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to change role')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(memberUserId: string, isSelf: boolean) {
    const verb = isSelf ? 'leave this organisation' : 'remove this member'
    if (!confirm(`Are you sure you want to ${verb}?`)) return
    setBusyId(memberUserId)
    setError('')
    try {
      const res = await fetch(`/api/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(memberUserId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail ?? `Failed (${res.status})`)
      }
      if (isSelf) {
        // Active org likely flipped server-side; reload the dashboard from
        // scratch so server components re-resolve the new active org.
        window.location.href = '/dashboard'
      } else {
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
      <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 divide-y divide-earth-200 dark:divide-basanite-700">
        {members.map(m => {
          const isSelf = m.user_id === viewerUserId
          const canEditRole = viewerRole === 'owner' && !isSelf
          const canRemove = isSelf || viewerRole === 'owner'
          return (
            <div key={m.user_id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-basanite-900 dark:text-earth-100 truncate">
                  {m.full_name ?? m.email ?? '(unknown)'}
                  {isSelf && <span className="ml-2 text-[10px] uppercase tracking-wide text-basanite-400 dark:text-earth-500">You</span>}
                </p>
                {m.email && m.full_name && (
                  <p className="text-xs text-basanite-500 dark:text-earth-400 truncate">{m.email}</p>
                )}
                <p className="text-[10px] uppercase tracking-wide text-basanite-400 dark:text-earth-500 mt-0.5">
                  Joined {new Date(m.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canEditRole ? (
                  <select
                    value={m.role}
                    onChange={e => changeRole(m.user_id, e.target.value)}
                    disabled={busyId === m.user_id}
                    className="text-xs border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 text-basanite-900 dark:text-earth-100 px-2 py-1.5 focus:outline-none focus:border-gold-500"
                  >
                    {ROLE_OPTIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-basanite-500 dark:text-earth-400 px-2 py-1.5 capitalize">{m.role}</span>
                )}
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => remove(m.user_id, isSelf)}
                    disabled={busyId === m.user_id}
                    className="text-xs text-basanite-500 dark:text-earth-400 hover:text-red-600 border border-earth-200 dark:border-basanite-700 hover:border-red-300 px-3 py-1.5 transition-colors disabled:opacity-60"
                  >
                    {isSelf ? 'Leave' : 'Remove'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
