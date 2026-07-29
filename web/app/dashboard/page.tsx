import { createServiceClient, getAuthUserId } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import RolesList from './RolesList'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  console.error('[DIAG] page: start')
  // Middleware already validated the session; we just need the user id to
  // scope queries. getAuthUserId reads it from the cookie JWT — no network.
  const userId = await getAuthUserId()
  console.error('[DIAG] page: userId =', userId)
  if (!userId) redirect('/login')

  const service = createServiceClient()
  console.error('[DIAG] page: service client created; querying roles…')

  const { data: roles } = await service
    .from('roles')
    .select('id, title, company_name, status, dimensions, created_at, assessment_link_token')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  console.error('[DIAG] page: roles query done, count =', roles?.length ?? 0)

  const roleIds = (roles ?? []).map(r => r.id)
  const assessmentCounts: Record<string, { total: number; completed: number }> = {}

  if (roleIds.length > 0) {
    const { data: assessments } = await service
      .from('assessments')
      .select('role_id, status')
      .in('role_id', roleIds)
    console.error('[DIAG] page: assessments query done, count =', assessments?.length ?? 0)

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
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl font-bold text-basanite-900 dark:text-earth-100">Dashboard</h1>
        <Link
          href="/dashboard/roles/new"
          className="bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white text-sm font-medium px-5 py-2.5 transition-colors duration-150"
        >
          + New Role
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total Roles" value={totalRoles} />
        <StatCard label="Live Roles" value={liveRoles} />
        <StatCard label="Total Assessments" value={totalAssessments} />
        <StatCard label="Completed" value={completedAssessments} />
      </div>

      {(!roles || roles.length === 0) ? (
        <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-12 text-center">
          <p className="text-basanite-600 dark:text-earth-300 mb-4">No roles yet. Create your first role to start assessing candidates.</p>
          <Link
            href="/dashboard/roles/new"
            className="inline-block bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white text-sm font-medium px-6 py-2.5 transition-colors"
          >
            Create a role
          </Link>
        </div>
      ) : (
        <RolesList roles={roles} counts={assessmentCounts} />
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-850 p-5 dark:shadow-[inset_0_1px_0_0_rgba(196,154,47,0.08)]">
      <p className="text-xs text-basanite-500 dark:text-earth-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-display text-basanite-900 dark:text-earth-100">{value}</p>
    </div>
  )
}
