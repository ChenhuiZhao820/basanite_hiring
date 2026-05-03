'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

const PAGE_SIZE = 20

type Role = {
  id: string
  title: string
  company_name: string | null
  status: 'draft' | 'live' | 'paused' | 'closed' | string
  dimensions: unknown
  created_at: string
}

type Counts = { total: number; completed: number }

const STATUS_FILTERS: Array<{ key: 'all' | 'live' | 'draft' | 'paused' | 'closed'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'draft', label: 'Draft' },
  { key: 'paused', label: 'Paused' },
  { key: 'closed', label: 'Closed' },
]

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-earth-200 text-basanite-600 dark:text-earth-300',
  live: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-slate-200 text-slate-600 dark:text-earth-300',
}

export default function RolesList({
  roles,
  counts,
}: {
  roles: Role[]
  counts: Record<string, Counts>
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<typeof STATUS_FILTERS[number]['key']>('all')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return roles.filter(r => {
      if (status !== 'all' && r.status !== status) return false
      if (!q) return true
      const t = r.title?.toLowerCase() ?? ''
      const c = r.company_name?.toLowerCase() ?? ''
      return t.includes(q) || c.includes(q)
    })
  }, [roles, query, status])

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = { all: roles.length }
    for (const r of roles) m[r.status] = (m[r.status] ?? 0) + 1
    return m
  }, [roles])

  // Reset to page 1 whenever the filtered set changes shape.
  useEffect(() => {
    setPage(1)
  }, [query, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const visible = filtered.slice(pageStart, pageStart + PAGE_SIZE)
  const showingFrom = filtered.length === 0 ? 0 : pageStart + 1
  const showingTo = Math.min(pageStart + PAGE_SIZE, filtered.length)

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="search"
          placeholder="Search roles or companies..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="flex-1 min-w-0 border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 text-sm px-3 py-2 text-basanite-900 dark:text-earth-100 placeholder:text-basanite-400 dark:placeholder:text-earth-500 focus:outline-none focus:border-basanite-900 dark:focus:border-gold-500"
        />
        <div className="flex flex-wrap gap-1 border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-1 shrink-0">
          {STATUS_FILTERS.map(f => {
            const active = status === f.key
            const count = statusCounts[f.key] ?? 0
            return (
              <button
                key={f.key}
                onClick={() => setStatus(f.key)}
                className={
                  'text-xs px-3 py-1.5 transition-colors ' +
                  (active
                    ? 'bg-basanite-900 dark:bg-gold-600 text-white'
                    : 'text-basanite-600 dark:text-earth-300 hover:text-basanite-900 dark:hover:text-earth-100 hover:bg-earth-100 dark:hover:bg-basanite-700')
                }
              >
                {f.label}
                <span className={'ml-1.5 ' + (active ? 'text-earth-200' : 'text-basanite-400 dark:text-earth-500')}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-12 text-center">
          <p className="text-basanite-500 dark:text-earth-400 text-sm">
            {query || status !== 'all' ? 'No roles match those filters.' : 'No roles yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map(role => (
              <RoleCard key={role.id} role={role} counts={counts[role.id] || { total: 0, completed: 0 }} />
            ))}
          </div>

          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-6 text-xs">
              <p className="text-basanite-400 dark:text-earth-500">
                Showing {showingFrom}-{showingTo} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-3 py-1.5 border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 text-basanite-600 dark:text-earth-300 hover:bg-earth-50 dark:hover:bg-basanite-700 hover:border-earth-300 dark:hover:border-basanite-700 transition-colors disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-earth-200"
                >
                  ← Previous
                </button>
                <span className="px-3 py-1.5 text-basanite-500 dark:text-earth-400">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="px-3 py-1.5 border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 text-basanite-600 dark:text-earth-300 hover:bg-earth-50 dark:hover:bg-basanite-700 hover:border-earth-300 dark:hover:border-basanite-700 transition-colors disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-earth-200"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function RoleCard({ role, counts }: { role: Role; counts: Counts }) {
  const dimensions = Array.isArray(role.dimensions) ? role.dimensions : []

  return (
    <Link
      href={`/dashboard/roles/${role.id}`}
      className="block border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-6 card-hover transition-all hover:shadow-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-display text-lg text-basanite-900 dark:text-earth-100 leading-tight">{role.title}</h3>
        <span className={`text-xs px-2 py-0.5 font-medium ${STATUS_COLORS[role.status] ?? STATUS_COLORS.draft}`}>
          {role.status}
        </span>
      </div>
      {role.company_name && <p className="text-sm text-basanite-500 dark:text-earth-400 mb-3">{role.company_name}</p>}
      <div className="flex items-center gap-4 text-xs text-basanite-500 dark:text-earth-400 mb-3">
        <span>{counts.total} assessment{counts.total !== 1 ? 's' : ''}</span>
        <span>{counts.completed} completed</span>
        <span>{dimensions.length} dimension{dimensions.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-xs text-basanite-400 dark:text-earth-500">
        Created {new Date(role.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </Link>
  )
}
