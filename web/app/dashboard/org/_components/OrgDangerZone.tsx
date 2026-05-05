'use client'

// Owner-only org deletion. Cascades through every org_id-keyed table —
// roles, voices, ATS connections, candidate assessments. We refuse to
// delete a personal org (id === user_id) at the API layer, so this
// component is rendered only when isPersonal === false.

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function OrgDangerZone({ orgId, orgName }: { orgId: string; orgName: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function destroy() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/orgs/${encodeURIComponent(orgId)}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail ?? `Failed (${res.status})`)
      }
      // Active org context flipped server-side; full reload to re-resolve.
      window.location.href = '/dashboard'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
      setBusy(false)
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs px-4 py-2 border border-red-200 dark:border-red-700/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        Delete this organisation
      </button>
    )
  }

  return (
    <div className="border border-red-200 dark:border-red-700/40 bg-red-50/50 dark:bg-red-900/10 p-4">
      <p className="text-sm text-red-700 dark:text-red-300 mb-3">
        Deleting <strong>{orgName}</strong> permanently removes every role, candidate assessment, cloned voice, and ATS connection that belongs to it. Type <strong>{orgName}</strong> below to confirm.
      </p>
      <input
        type="text"
        value={confirmText}
        onChange={e => setConfirmText(e.target.value)}
        placeholder={orgName}
        className="w-full max-w-sm border border-red-300 dark:border-red-700/40 bg-white dark:bg-basanite-800 px-3 py-2 text-sm text-basanite-900 dark:text-earth-100 outline-none focus:border-red-500 mb-3"
      />
      {error && <p className="text-sm text-red-700 dark:text-red-300 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setConfirming(false); setConfirmText(''); setError('') }}
          disabled={busy}
          className="text-xs px-4 py-2 border border-earth-200 dark:border-basanite-700 text-basanite-600 dark:text-earth-300 hover:bg-earth-50 dark:hover:bg-basanite-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={destroy}
          disabled={busy || confirmText !== orgName}
          className="text-xs px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40"
        >
          {busy ? 'Deleting…' : 'Permanently delete'}
        </button>
      </div>
    </div>
  )
}
