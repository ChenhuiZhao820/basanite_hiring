'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

export default function NewOrgPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail ?? `Failed (${res.status})`)
      }
      // The API set this new org as active; reload so server components re-resolve.
      window.location.href = '/dashboard/org'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create')
      setBusy(false)
    }
  }

  return (
    <div className="max-w-xl">
      <Link href="/dashboard/org" className="text-xs text-basanite-400 dark:text-earth-500 hover:text-basanite-600 dark:hover:text-earth-300 transition-colors mb-4 inline-block">
        &larr; Back to organisation
      </Link>
      <h1 className="font-display text-2xl text-basanite-900 dark:text-earth-100 mb-2">New organisation</h1>
      <p className="text-sm text-basanite-500 dark:text-earth-400 mb-8">
        Create a shared workspace for your team. You can invite teammates and configure auto-join afterwards.
      </p>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-basanite-600 dark:text-earth-300 mb-1.5 uppercase tracking-wide">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            maxLength={200}
            placeholder="Acme Inc"
            className="w-full border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 placeholder-basanite-400 dark:placeholder-earth-500 px-4 py-2.5 text-sm text-basanite-900 dark:text-earth-100 outline-none focus:border-gold-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-basanite-600 dark:text-earth-300 mb-1.5 uppercase tracking-wide">Description <span className="text-basanite-400 dark:text-earth-500 normal-case">(optional)</span></label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={500}
            placeholder="Tech recruitment, Manchester"
            className="w-full border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 placeholder-basanite-400 dark:placeholder-earth-500 px-4 py-2.5 text-sm text-basanite-900 dark:text-earth-100 outline-none focus:border-gold-500 transition-colors"
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="px-5 py-2.5 bg-basanite-900 dark:bg-gold-600 text-white text-sm font-medium hover:bg-gold-600 dark:hover:bg-gold-500 transition-colors disabled:opacity-40"
        >
          {busy ? 'Creating…' : 'Create organisation'}
        </button>
      </form>
    </div>
  )
}
