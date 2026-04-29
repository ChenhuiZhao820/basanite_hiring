import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()

  // Fetch roles for this user
  const { data: roles } = await service
    .from('roles')
    .select('id, title, company_name, status, dimensions, created_at, assessment_link_token')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch assessment counts per role
  const roleIds = (roles ?? []).map(r => r.id)
  let assessmentCounts: Record<string, { total: number; completed: number }> = {}

  if (roleIds.length > 0) {
    const { data: assessments } = await service
      .from('assessments')
      .select('role_id, status')
      .in('role_id', roleIds)

    for (const a of assessments ?? []) {
      if (!assessmentCounts[a.role_id]) {
        assessmentCounts[a.role_id] = { total: 0, completed: 0 }
      }
      assessmentCounts[a.role_id].total++
      if (a.status === 'completed') assessmentCounts[a.role_id].completed++
    }
  }

  const totalRoles = roles?.length ?? 0
  const liveRoles = roles?.filter(r => r.status === 'live').length ?? 0
  const totalAssessments = Object.values(assessmentCounts).reduce((sum, c) => sum + c.total, 0)
  const completedAssessments = Object.values(assessmentCounts).reduce((sum, c) => sum + c.completed, 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl font-bold text-basanite-900">Dashboard</h1>
        <Link
          href="/dashboard/roles/new"
          className="bg-basanite-900 hover:bg-gold-600 text-white text-sm font-medium px-5 py-2.5 transition-colors duration-150"
        >
          + New Role
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total Roles" value={totalRoles} />
        <StatCard label="Live Roles" value={liveRoles} />
        <StatCard label="Total Assessments" value={totalAssessments} />
        <StatCard label="Completed" value={completedAssessments} />
      </div>

      {/* Roles Grid */}
      {(!roles || roles.length === 0) ? (
        <div className="border border-earth-200 bg-white p-12 text-center">
          <p className="text-basanite-600 mb-4">No roles yet. Create your first role to start assessing candidates.</p>
          <Link
            href="/dashboard/roles/new"
            className="inline-block bg-basanite-900 hover:bg-gold-600 text-white text-sm font-medium px-6 py-2.5 transition-colors"
          >
            Create a role
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <RoleCard
              key={role.id}
              role={role}
              counts={assessmentCounts[role.id] || { total: 0, completed: 0 }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-earth-200 bg-white p-5">
      <p className="text-xs text-basanite-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-display text-basanite-900">{value}</p>
    </div>
  )
}

function RoleCard({ role, counts }: { role: any; counts: { total: number; completed: number } }) {
  const statusColors: Record<string, string> = {
    draft: 'bg-earth-200 text-basanite-600',
    live: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    closed: 'bg-slate-200 text-slate-600',
  }

  const dimensions = Array.isArray(role.dimensions) ? role.dimensions : []

  return (
    <Link
      href={`/dashboard/roles/${role.id}`}
      className="block border border-earth-200 bg-white p-6 card-hover transition-all hover:shadow-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-display text-lg text-basanite-900 leading-tight">{role.title}</h3>
        <span className={`text-xs px-2 py-0.5 font-medium ${statusColors[role.status] ?? statusColors.draft}`}>
          {role.status}
        </span>
      </div>

      {role.company_name && (
        <p className="text-sm text-basanite-500 mb-3">{role.company_name}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-basanite-500 mb-3">
        <span>{counts.total} assessment{counts.total !== 1 ? 's' : ''}</span>
        <span>{counts.completed} completed</span>
        <span>{dimensions.length} dimension{dimensions.length !== 1 ? 's' : ''}</span>
      </div>

      <p className="text-xs text-basanite-400">
        Created {new Date(role.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </Link>
  )
}
