'use client'

// Edit org name / description / auto-join domain. PATCH-on-save with
// router.refresh() so the rest of the page reflects the new state.

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  orgId: string
  initialName: string
  initialDescription: string | null
  initialAutoJoinDomain: string | null
  userEmailDomain?: string | null
  canEdit: boolean
}

export function OrgProfileForm({ orgId, initialName, initialDescription, initialAutoJoinDomain, userEmailDomain, canEdit }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [autoJoinDomain, setAutoJoinDomain] = useState(initialAutoJoinDomain ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const dirty =
    name.trim() !== initialName ||
    description.trim() !== (initialDescription ?? '') ||
    autoJoinDomain.trim().toLowerCase() !== (initialAutoJoinDomain ?? '').toLowerCase()

  async function save() {
    if (!canEdit || !dirty || saving) return
    setSaving(true)
    setError('')
    try {
      const body: Record<string, unknown> = { name: name.trim() }
      body.description = description.trim()
      const trimmedDomain = autoJoinDomain.trim()
      if (!trimmedDomain) {
        body.clear_auto_join_domain = true
      } else {
        body.auto_join_domain = trimmedDomain.toLowerCase()
      }
      const res = await fetch(`/api/orgs/${encodeURIComponent(orgId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail ?? data?.error ?? `Save failed (${res.status})`)
      }
      setSavedAt(Date.now())
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-basanite-600 dark:text-earth-300 mb-1.5 uppercase tracking-wide">Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={!canEdit}
          maxLength={200}
          className="w-full max-w-md border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 placeholder-basanite-400 dark:placeholder-earth-500 px-4 py-2.5 text-sm text-basanite-900 dark:text-earth-100 outline-none focus:border-gold-500 transition-colors disabled:opacity-60"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-basanite-600 dark:text-earth-300 mb-1.5 uppercase tracking-wide">Description <span className="text-basanite-400 dark:text-earth-500 normal-case">(optional)</span></label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          disabled={!canEdit}
          maxLength={500}
          placeholder="e.g. Tech recruitment agency in Manchester"
          className="w-full max-w-md border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 placeholder-basanite-400 dark:placeholder-earth-500 px-4 py-2.5 text-sm text-basanite-900 dark:text-earth-100 outline-none focus:border-gold-500 transition-colors disabled:opacity-60"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-basanite-600 dark:text-earth-300 mb-1.5 uppercase tracking-wide">Auto-join domain <span className="text-basanite-400 dark:text-earth-500 normal-case">(optional)</span></label>
        <input
          type="text"
          value={autoJoinDomain}
          onChange={e => setAutoJoinDomain(e.target.value)}
          disabled={!canEdit}
          maxLength={200}
          placeholder={userEmailDomain || 'acme.com'}
          className="w-full max-w-md border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 placeholder-basanite-400 dark:placeholder-earth-500 px-4 py-2.5 text-sm text-basanite-900 dark:text-earth-100 outline-none focus:border-gold-500 transition-colors disabled:opacity-60"
        />
        <p className="text-xs text-basanite-500 dark:text-earth-400 mt-1.5 max-w-md">
          New signups whose email matches this domain will automatically join this organisation. Free email providers (gmail, outlook, etc.) aren&rsquo;t allowed.
        </p>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {canEdit && (
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="px-5 py-2.5 bg-basanite-900 dark:bg-gold-600 text-white text-sm font-medium hover:bg-gold-600 dark:hover:bg-gold-500 transition-colors disabled:opacity-40"
        >
          {saving ? 'Saving…' : savedAt ? 'Saved' : 'Save changes'}
        </button>
      )}
    </div>
  )
}
