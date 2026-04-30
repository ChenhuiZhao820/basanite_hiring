'use client'

// Hirer-facing "Connect ATS" page. Uses Merge's React component to handle the
// hosted Magic Link flow: the user clicks Connect, picks their ATS, signs in
// at the provider, and we receive a `public_token` via the onSuccess callback.
// We then call our /api/integrations/merge/exchange to swap that for the
// long-lived account_token, which FastAPI encrypts and persists.

import { useCallback, useEffect, useState } from 'react'
import { useMergeLink } from '@mergeapi/react-merge-link'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

type Connection = {
  id: string
  org_id: string
  provider: string | null
  status: 'connected' | 'disconnected' | 'error'
  end_user_email: string | null
  connected_at: string | null
  last_synced_at: string | null
}

function prettyProvider(slug: string | null): string {
  if (!slug) return 'Unknown'
  return slug.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function IntegrationsPage() {
  useDocumentTitle('Integrations')

  const [connections, setConnections] = useState<Connection[] | null>(null)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loadingLink, setLoadingLink] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Fetch current connections on mount + after every change.
  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/merge/connections')
      if (!res.ok) throw new Error('Failed to load connections')
      const data = await res.json()
      setConnections(data.connections ?? [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load connections'
      setError(msg)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Mint a Link Token only when the user actually clicks Connect — they're
  // single-use and short-lived.
  async function startConnect() {
    setError('')
    setLoadingLink(true)
    try {
      const res = await fetch('/api/integrations/merge/link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      if (!data.link_token) throw new Error('No link_token returned')
      setLinkToken(data.link_token)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start connection flow'
      setError(msg)
    } finally {
      setLoadingLink(false)
    }
  }

  // Exchange the public_token Merge returns to us for the long-lived account
  // token (server-side).
  const onSuccess = useCallback(async (publicToken: string) => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/integrations/merge/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: publicToken }),
      })
      if (!res.ok) throw new Error(await res.text())
      await refresh()
      setLinkToken(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Connection failed at exchange step'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }, [refresh])

  const { open, isReady } = useMergeLink({
    linkToken: linkToken ?? '',
    onSuccess,
    onExit: () => { /* user cancelled — leave the link_token unused */ },
  })

  // Auto-open Merge Link as soon as the SDK is ready and we have a token.
  useEffect(() => {
    if (linkToken && isReady) open()
  }, [linkToken, isReady, open])

  async function disconnect(id: string) {
    if (!confirm('Disconnect this ATS? Existing in-flight assessments keep running, but new candidates will not auto-sync.')) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/integrations/merge/connections/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(await res.text())
      await refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Disconnect failed'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  const connectedRows = (connections ?? []).filter(c => c.status === 'connected')

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl text-basanite-900 mb-1">Integrations</h1>
        <p className="text-sm text-slate-500">
          Connect your applicant tracking system to send candidates into Basanite assessments
          automatically. We support Greenhouse, Lever, Ashby and 50+ others via Merge.dev.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <section className="bg-white border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-medium text-basanite-900 text-base mb-1">Applicant Tracking System</h2>
            <p className="text-xs text-slate-500">
              {connectedRows.length === 0
                ? 'No ATS connected yet. Connect one to start syncing candidates.'
                : `${connectedRows.length} ATS connected.`}
            </p>
          </div>
          <button
            onClick={startConnect}
            disabled={loadingLink || busy}
            className="bg-basanite-900 hover:bg-gold-600 text-white text-xs font-medium px-4 py-2 transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {loadingLink ? 'Starting…' : busy ? 'Working…' : connectedRows.length === 0 ? 'Connect ATS' : 'Connect another'}
          </button>
        </div>

        {connections === null ? (
          <p className="text-xs text-slate-400 mt-6">Loading connections…</p>
        ) : connectedRows.length > 0 ? (
          <div className="mt-6 border-t border-slate-100 pt-4 space-y-3">
            {connectedRows.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-basanite-900 font-medium">{prettyProvider(c.provider)}</div>
                  <div className="text-xs text-slate-400">
                    {c.end_user_email ?? 'connected'}
                    {c.connected_at && ' · ' + new Date(c.connected_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => disconnect(c.id)}
                  disabled={busy}
                  className="text-xs text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-300 px-3 py-1.5 transition-colors disabled:opacity-60"
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <p className="text-xs text-slate-400">
        Once connected, a follow-up step lets you map your ATS jobs to Basanite roles and
        toggle auto-invites per job.
      </p>
    </div>
  )
}
