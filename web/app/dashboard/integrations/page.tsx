'use client'

// Hirer-facing "Connect ATS" page. Two sections:
//   1. Connect / Disconnect via Merge Magic Link.
//   2. Map ATS jobs → Basanite roles. Mapped jobs auto-create assessments
//      and email candidates when they apply on the customer's ATS.

import { useCallback, useEffect, useState } from 'react'
import { useMergeLink } from '@mergeapi/react-merge-link'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { createClient } from '@/lib/supabase/client'

type Connection = {
  id: string
  org_id: string
  provider: string | null
  status: 'connected' | 'disconnected' | 'error'
  end_user_email: string | null
  connected_at: string | null
  last_synced_at: string | null
}

type AtsJob = {
  merge_job_id: string
  remote_job_id: string | null
  name: string | null
  status: string | null
  departments: (string | null)[]
}

type Mapping = {
  id: string
  connection_id: string
  merge_job_id: string
  remote_job_id: string | null
  job_name: string | null
  role_id: string
  auto_invite: boolean
  created_at: string | null
}

type Role = {
  id: string
  title: string
  status: string | null
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

  // Job mapping state
  const [jobs, setJobs] = useState<AtsJob[] | null>(null)
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)

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

  const refreshJobs = useCallback(async () => {
    setJobsLoading(true)
    try {
      const [jobsRes, mappingsRes] = await Promise.all([
        fetch('/api/integrations/merge/jobs'),
        fetch('/api/integrations/merge/job-mappings'),
      ])
      if (jobsRes.ok) {
        const data = await jobsRes.json()
        setJobs(data.connected ? (data.jobs ?? []) : [])
      } else {
        setJobs([])
      }
      if (mappingsRes.ok) {
        const data = await mappingsRes.json()
        setMappings(data.mappings ?? [])
      }
    } catch (e) {
      // Non-fatal; jobs section will show empty state.
      console.error('refreshJobs failed', e)
    } finally {
      setJobsLoading(false)
    }
  }, [])

  // Load the user's Basanite roles so we can populate the mapping dropdowns.
  const refreshRoles = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('roles')
        .select('id, title, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setRoles((data ?? []) as Role[])
    } catch (e) {
      console.error('refreshRoles failed', e)
    }
  }, [])

  useEffect(() => {
    void refresh()
    void refreshRoles()
  }, [refresh, refreshRoles])

  const connectedRows = (connections ?? []).filter(c => c.status === 'connected')
  const hasConnection = connectedRows.length > 0

  // Once we know there's an active connection, pull the ATS jobs + mappings.
  useEffect(() => {
    if (hasConnection) void refreshJobs()
  }, [hasConnection, refreshJobs])

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
    onExit: () => { /* user cancelled */ },
  })

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

  async function saveMapping(job: AtsJob, roleId: string, autoInvite: boolean) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/integrations/merge/job-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merge_job_id: job.merge_job_id,
          remote_job_id: job.remote_job_id,
          job_name: job.name,
          role_id: roleId,
          auto_invite: autoInvite,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      await refreshJobs()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save mapping'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  async function deleteMapping(mappingId: string) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/integrations/merge/job-mappings/${encodeURIComponent(mappingId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(await res.text())
      await refreshJobs()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to remove mapping'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  const mappingByMergeJobId = new Map(mappings.map(m => [m.merge_job_id, m]))
  const liveRoles = roles.filter(r => r.status === 'live')

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl text-basanite-900 mb-1">Integrations</h1>
        <p className="text-sm text-slate-500">
          Connect your applicant tracking system to send candidates into Basanite assessments
          automatically. Greenhouse, Lever, Ashby and 50+ others via Merge.dev.
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

      {hasConnection && (
        <section className="bg-white border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="font-medium text-basanite-900 text-base mb-1">Map jobs → Basanite roles</h2>
              <p className="text-xs text-slate-500 max-w-xl">
                Pick which jobs in your ATS should send candidates to which Basanite role.
                When a candidate applies, we&apos;ll auto-create their assessment with the
                CV pulled from your ATS, and email them an interview link.
              </p>
            </div>
            <button
              onClick={() => void refreshJobs()}
              disabled={jobsLoading || busy}
              className="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 hover:text-basanite-900 hover:border-slate-300 disabled:opacity-60"
            >
              {jobsLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {liveRoles.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 mb-4">
              No live Basanite roles yet. Create and publish a role first, then come back to map jobs to it.
            </div>
          )}

          {jobs === null ? (
            <p className="text-xs text-slate-400">Loading ATS jobs…</p>
          ) : jobs.length === 0 ? (
            <p className="text-xs text-slate-400">
              No open jobs found in your ATS. (Closed/archived jobs are hidden.)
            </p>
          ) : (
            <div className="border-t border-slate-100">
              {jobs.map(job => {
                const mapping = mappingByMergeJobId.get(job.merge_job_id)
                const roleTitle = mapping ? roles.find(r => r.id === mapping.role_id)?.title : undefined
                return (
                  <JobRow
                    key={job.merge_job_id}
                    job={job}
                    mapping={mapping}
                    mappedRoleTitle={roleTitle}
                    roles={liveRoles}
                    busy={busy}
                    onSave={(roleId, autoInvite) => saveMapping(job, roleId, autoInvite)}
                    onDelete={() => mapping && deleteMapping(mapping.id)}
                  />
                )
              })}
            </div>
          )}

          <p className="text-xs text-slate-400 mt-4">
            Outbound results (interview score + report PDF) push back to the candidate&apos;s ATS
            application after the interview completes. This is currently in dark-launch mode for
            safety; ask Basanite support to enable it for your org once you&apos;re ready.
          </p>
        </section>
      )}
    </div>
  )
}

function JobRow({
  job,
  mapping,
  mappedRoleTitle,
  roles,
  busy,
  onSave,
  onDelete,
}: {
  job: AtsJob
  mapping: Mapping | undefined
  mappedRoleTitle: string | undefined
  roles: Role[]
  busy: boolean
  onSave: (roleId: string, autoInvite: boolean) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draftRoleId, setDraftRoleId] = useState<string>(mapping?.role_id ?? '')
  const [draftAutoInvite, setDraftAutoInvite] = useState<boolean>(mapping?.auto_invite ?? true)

  return (
    <div className="border-b border-slate-100 py-3 flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-sm text-basanite-900 truncate">{job.name ?? 'Untitled job'}</div>
        <div className="text-xs text-slate-400 truncate">
          {job.departments.filter(Boolean).join(' · ') || 'No department'}
          {job.status && ' · ' + job.status.toLowerCase()}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!editing && mapping ? (
          <>
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1">
              → {mappedRoleTitle ?? 'role'}
              {!mapping.auto_invite && ' · invites paused'}
            </span>
            <button
              onClick={() => { setDraftRoleId(mapping.role_id); setDraftAutoInvite(mapping.auto_invite); setEditing(true) }}
              disabled={busy}
              className="text-xs text-slate-500 hover:text-basanite-900 border border-slate-200 px-2 py-1 disabled:opacity-60"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              disabled={busy}
              className="text-xs text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-300 px-2 py-1 disabled:opacity-60"
            >
              Unmap
            </button>
          </>
        ) : !editing ? (
          <button
            onClick={() => { setDraftRoleId(roles[0]?.id ?? ''); setDraftAutoInvite(true); setEditing(true) }}
            disabled={busy || roles.length === 0}
            className="text-xs text-basanite-900 border border-basanite-900 hover:bg-basanite-900 hover:text-white px-2 py-1 disabled:opacity-60"
          >
            Map to role
          </button>
        ) : (
          <>
            <select
              value={draftRoleId}
              onChange={e => setDraftRoleId(e.target.value)}
              className="text-xs border border-slate-200 px-2 py-1 max-w-[180px]"
            >
              <option value="" disabled>Pick a role…</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
            <label className="text-xs text-slate-500 flex items-center gap-1">
              <input
                type="checkbox"
                checked={draftAutoInvite}
                onChange={e => setDraftAutoInvite(e.target.checked)}
              />
              Auto-invite
            </label>
            <button
              onClick={() => { if (draftRoleId) onSave(draftRoleId, draftAutoInvite); setEditing(false) }}
              disabled={busy || !draftRoleId}
              className="text-xs bg-basanite-900 hover:bg-gold-600 text-white px-2 py-1 disabled:opacity-60"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-slate-500 px-2 py-1"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}
