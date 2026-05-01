import { createServiceClient, createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CopyButton } from '@/components/CopyButton'
import { AssessmentRowMenu } from '@/components/AssessmentRowMenu'
import { RoleMenu } from '@/components/RoleMenu'

export const metadata = { title: 'Role' }

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()

  const { data: role } = await service
    .from('roles')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!role) redirect('/dashboard')

  // Fetch assessments with scores
  const { data: assessments } = await service
    .from('assessments')
    .select('*, dimension_scores(*), reports(*)')
    .eq('role_id', id)
    .order('created_at', { ascending: false })

  const dimensions = Array.isArray(role.dimensions) ? role.dimensions : []
  const assessmentLink = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basanite.co.uk'}/assess/${role.assessment_link_token}`

  const statusColors: Record<string, string> = {
    draft: 'bg-earth-200 text-basanite-600',
    live: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    closed: 'bg-slate-200 text-slate-600',
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link href="/dashboard" className="text-xs text-basanite-400 hover:text-basanite-600 transition-colors mb-2 inline-block">
            &larr; Back to dashboard
          </Link>
          <h1 className="font-display text-2xl text-basanite-900">{role.title}</h1>
          {role.company_name && <p className="text-sm text-basanite-500 mt-1">{role.company_name}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1 font-medium ${statusColors[role.status] ?? statusColors.draft}`}>
            {role.status}
          </span>
          <RoleMenu roleId={role.id} roleTitle={role.title} status={role.status} />
        </div>
      </div>

      {/* Assessment Link */}
      {role.status === 'live' && (
        <div className="border border-gold-500/30 bg-gold-500/5 p-5 mb-8">
          <p className="text-xs text-basanite-600 font-medium uppercase tracking-wide mb-2">Assessment Link</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-sm text-basanite-800 bg-white border border-earth-200 px-3 py-2 font-mono truncate">
              {assessmentLink}
            </code>
            <CopyButton text={assessmentLink} />
          </div>
          <p className="text-xs text-basanite-400 mt-2">Share this link with candidates to start their assessment.</p>
        </div>
      )}

      {/* Role Config Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="border border-earth-200 bg-white p-4">
          <p className="text-xs text-basanite-400 uppercase tracking-wide mb-1">Dimensions</p>
          <div className="flex flex-wrap gap-1.5">
            {dimensions.map((d: string) => (
              <span key={d} className="text-xs bg-earth-100 text-basanite-600 px-2 py-0.5">
                {d.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
        <div className="border border-earth-200 bg-white p-4">
          <p className="text-xs text-basanite-400 uppercase tracking-wide mb-1">Technical Depth</p>
          <p className="text-sm text-basanite-900 capitalize">{(role.technical_depth ?? 'application').replace('_', ' / ')}</p>
        </div>
        <div className="border border-earth-200 bg-white p-4">
          <p className="text-xs text-basanite-400 uppercase tracking-wide mb-1">Assessments</p>
          <p className="text-sm text-basanite-900">{assessments?.length ?? 0} total</p>
        </div>
      </div>

      {/* Candidate Queue */}
      <h2 className="font-display text-lg text-basanite-900 mb-4">Candidate Queue</h2>

      {(!assessments || assessments.length === 0) ? (
        <div className="border border-earth-200 bg-white p-10 text-center">
          <p className="text-basanite-500 text-sm">No candidates have taken this assessment yet.</p>
          <p className="text-basanite-400 text-xs mt-2">Share the assessment link to get started.</p>
        </div>
      ) : (
        <div className="border border-earth-200 bg-white divide-y divide-earth-200">
          {/* Header */}
          <div className="flex items-stretch text-xs text-basanite-400 uppercase tracking-wide font-medium">
            <div className="flex-1 grid grid-cols-12 gap-4 px-5 py-3">
              <div className="col-span-3">Candidate</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-4">Dimension Scores</div>
              <div className="col-span-1">Score</div>
              <div className="col-span-2">Date</div>
            </div>
            <div className="w-10 pr-3" aria-hidden="true" />
          </div>
          {/* Rows */}
          {assessments.map((a: any) => {
            const scores = a.dimension_scores ?? []
            const avgScore = scores.length > 0
              ? (scores.reduce((sum: number, s: any) => sum + (s.score ?? 0), 0) / scores.length).toFixed(1)
              : '-'

            const hirerReport = (a.reports ?? []).find((r: any) => r.report_type === 'hirer')

            const assessmentStatusColors: Record<string, string> = {
              pending: 'text-basanite-400',
              cv_uploaded: 'text-blue-600',
              in_progress: 'text-yellow-600',
              completed: 'text-green-600',
              abandoned: 'text-red-400',
            }

            return (
              <div
                key={a.id}
                className="flex items-stretch hover:bg-earth-50 transition-colors"
              >
                <Link
                  href={`/dashboard/roles/${id}/assessment/${a.id}`}
                  className="flex-1 grid grid-cols-12 gap-4 px-5 py-4 items-center"
                >
                  <div className="col-span-3">
                    <p className="text-sm text-basanite-900 font-medium">{a.candidate_name ?? 'Unknown'}</p>
                    <p className="text-xs text-basanite-400">{a.candidate_email}</p>
                  </div>
                  <div className="col-span-2">
                    <span className={`text-xs font-medium ${assessmentStatusColors[a.status] ?? 'text-basanite-400'}`}>
                      {a.status}
                    </span>
                  </div>
                  <div className="col-span-4 flex gap-1">
                    {scores.map((s: any) => (
                      <div
                        key={s.dimension_key}
                        className="flex items-center gap-1 bg-earth-100 px-1.5 py-0.5 text-xs"
                        title={`${s.dimension_key}: ${s.score}/5`}
                      >
                        <span className="text-basanite-400 truncate max-w-[60px]">{s.dimension_key.split('_')[0]}</span>
                        <span className="font-medium text-basanite-700">{s.score}</span>
                      </div>
                    ))}
                  </div>
                  <div className="col-span-1">
                    <span className="text-sm font-display text-gold-600">{avgScore}</span>
                  </div>
                  <div className="col-span-2 text-xs text-basanite-400">
                    {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                </Link>
                <div className="flex items-center pr-3">
                  <AssessmentRowMenu
                    roleId={id}
                    assessmentId={a.id}
                    candidateLabel={a.candidate_name ?? a.candidate_email ?? 'this candidate'}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

