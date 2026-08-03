import { createServiceClient, getAuthUserId } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CopyButton } from '@/components/CopyButton'
import { AssessmentRowMenu } from '@/components/AssessmentRowMenu'
import { RoleMenu } from '@/components/RoleMenu'
import { RoleVoiceTile } from '@/components/RoleVoiceTile'
import { InterviewPlanPanel } from '@/components/InterviewPlanPanel'
import { GoLiveButton } from '@/components/GoLiveButton'

export const metadata = { title: 'Role' }

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userId = await getAuthUserId()
  if (!userId) redirect('/login')

  const service = createServiceClient()

  const { data: role } = await service
    .from('roles')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!role) redirect('/dashboard')

  // Fetch assessments with scores, then rank: scored candidates first by
  // average dimension score (desc), unscored ones after by recency.
  const { data: rawAssessments } = await service
    .from('assessments')
    .select('*, dimension_scores(*), reports(*)')
    .eq('role_id', id)
    .order('created_at', { ascending: false })

  // Rank the queue: Test Mode is_mock rows are pinned to the bottom, then
  // within each group scored candidates come first by average dimension
  // score (desc) and unscored ones follow by recency. Mock rows are
  // excluded from the assessments tally so testers never skew counts.
  const avgOf = (a: any) => {
    const s = a.dimension_scores ?? []
    return s.length > 0 ? s.reduce((sum: number, x: any) => sum + (x.score ?? 0), 0) / s.length : null
  }
  const sortedAssessments = [...(rawAssessments ?? [])].sort((a: any, b: any) => {
    const mockDelta = Number(a.is_mock === true) - Number(b.is_mock === true)
    if (mockDelta !== 0) return mockDelta
    const av = avgOf(a)
    const bv = avgOf(b)
    if (av !== null && bv !== null) return bv - av
    if (av !== null) return -1
    if (bv !== null) return 1
    return Date.parse(b.created_at) - Date.parse(a.created_at)
  })
  const realAssessmentsCount = sortedAssessments.filter((a: any) => !a.is_mock).length

  const dimensions = Array.isArray(role.dimensions) ? role.dimensions : []
  const assessmentLink = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basanite.co.uk'}/assess/${role.assessment_link_token}`

  const statusColors: Record<string, string> = {
    draft: 'bg-earth-200 text-basanite-600 dark:text-earth-300',
    live: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    closed: 'bg-slate-200 text-slate-600 dark:text-earth-300',
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link href="/dashboard" className="text-xs text-basanite-400 dark:text-earth-500 hover:text-basanite-600 dark:hover:text-earth-300 transition-colors mb-2 inline-block">
            &larr; Back to dashboard
          </Link>
          <h1 className="font-display text-2xl text-basanite-900 dark:text-earth-100">{role.title}</h1>
          {role.company_name && <p className="text-sm text-basanite-500 dark:text-earth-400 mt-1">{role.company_name}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1 font-medium ${statusColors[role.status] ?? statusColors.draft}`}>
            {role.status}
          </span>
          <RoleMenu roleId={role.id} roleTitle={role.title} status={role.status} />
        </div>
      </div>

      {/* Draft: go-live call to action */}
      {role.status === 'draft' && (
        <GoLiveButton roleId={role.id} hasPlan={Boolean(role.interview_plan)} dimensionsCount={dimensions.length} />
      )}

      {/* Application Link */}
      {role.status === 'live' && (
        <div className="border border-gold-500/30 bg-gold-500/5 p-5 mb-8">
          <p className="text-xs text-basanite-600 dark:text-earth-300 font-medium uppercase tracking-wide mb-2">Application Link</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-sm text-basanite-800 dark:text-earth-100 bg-white dark:bg-basanite-800 border border-earth-200 dark:border-basanite-700 px-3 py-2 font-mono truncate">
              {assessmentLink}
            </code>
            <CopyButton text={assessmentLink} />
          </div>
          <div className="flex items-center justify-between gap-3 mt-2">
            <p className="text-xs text-basanite-400 dark:text-earth-500">Share this link anywhere you advertise the role — candidates apply and interview from it.</p>
            <Link
              href={`/dashboard/roles/${role.id}/copilot/new`}
              className="shrink-0 border border-gold-500/60 text-gold-600 hover:bg-gold-500/10 text-xs font-medium px-4 py-2 transition-colors"
            >
              Run Copilot interview
            </Link>
          </div>
        </div>
      )}

      {/* Interview Plan */}
      <InterviewPlanPanel
        roleId={role.id}
        status={role.status}
        initialPlan={role.interview_plan ?? null}
        planEditedAt={role.interview_plan_edited_at ?? null}
        initialDimensions={dimensions}
      />

      {/* Role Config Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-4">
          <p className="text-xs text-basanite-400 dark:text-earth-500 uppercase tracking-wide mb-1">Dimensions</p>
          <div className="flex flex-wrap gap-1.5">
            {dimensions.map((d: string) => (
              <span key={d} className="text-xs bg-earth-100 dark:bg-basanite-800 text-basanite-600 dark:text-earth-300 px-2 py-0.5">
                {d.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
        <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-4">
          <p className="text-xs text-basanite-400 dark:text-earth-500 uppercase tracking-wide mb-1">Technical Depth</p>
          <p className="text-sm text-basanite-900 dark:text-earth-100 capitalize">{(role.technical_depth ?? 'application').replace('_', ' / ')}</p>
        </div>
        <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-4">
          <p className="text-xs text-basanite-400 dark:text-earth-500 uppercase tracking-wide mb-1">Assessments</p>
          <p className="text-sm text-basanite-900 dark:text-earth-100">{realAssessmentsCount} total</p>
        </div>
        <RoleVoiceTile roleId={role.id} initialVoiceId={role.interviewer_voice_id ?? null} />
      </div>

      {/* Candidate Queue */}
      <h2 className="font-display text-lg text-basanite-900 dark:text-earth-100 mb-4">Candidate Queue</h2>

      {(sortedAssessments.length === 0) ? (
        <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-10 text-center">
          <p className="text-basanite-500 dark:text-earth-400 text-sm">No candidates have taken this assessment yet.</p>
          <p className="text-basanite-400 dark:text-earth-500 text-xs mt-2">Share the assessment link to get started.</p>
        </div>
      ) : (
        <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 divide-y divide-earth-200 dark:divide-basanite-700">
          {/* Header */}
          <div className="flex items-stretch text-xs text-basanite-400 dark:text-earth-500 uppercase tracking-wide font-medium">
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
          {sortedAssessments.map((a: any, idx: number) => {
            const scores = a.dimension_scores ?? []
            const avgScore = scores.length > 0
              ? (scores.reduce((sum: number, s: any) => sum + (s.score ?? 0), 0) / scores.length).toFixed(1)
              : '-'

            const hirerReport = (a.reports ?? []).find((r: any) => r.report_type === 'hirer')

            const assessmentStatusColors: Record<string, string> = {
              pending: 'text-basanite-400 dark:text-earth-500',
              cv_uploaded: 'text-blue-600',
              in_progress: 'text-yellow-600',
              completed: 'text-green-600',
              abandoned: 'text-red-400',
            }

            return (
              <div
                key={a.id}
                className={
                  'flex items-stretch hover:bg-earth-50 dark:hover:bg-basanite-700 transition-colors ' +
                  (idx % 2 === 0 ? '' : 'dark:bg-basanite-850') +
                  (a.is_mock ? ' opacity-50 grayscale' : '')
                }
              >
                <Link
                  href={`/dashboard/roles/${id}/assessment/${a.id}`}
                  className="flex-1 grid grid-cols-12 gap-4 px-5 py-4 items-center"
                >
                  <div className="col-span-3">
                    <p className="text-sm text-basanite-900 dark:text-earth-100 font-medium">{a.candidate_name ?? 'Unknown'}</p>
                    <p className="text-xs text-basanite-400 dark:text-earth-500">{a.candidate_email}</p>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <span className={`text-xs font-medium ${assessmentStatusColors[a.status] ?? 'text-basanite-400 dark:text-earth-500'}`}>
                      {a.status}
                    </span>
                    {a.is_mock && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 border border-slate-400 text-slate-500 dark:border-earth-500 dark:text-earth-400">
                        TEST
                      </span>
                    )}
                    {a.source === 'copilot' && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 border border-gold-500/60 text-gold-600">
                        COPILOT
                      </span>
                    )}
                  </div>
                  <div className="col-span-4 flex gap-1">
                    {a.is_mock ? (
                      <span className="text-xs italic text-basanite-400 dark:text-earth-500">TEST — no data</span>
                    ) : (
                      scores.map((s: any) => (
                        <div
                          key={s.dimension_key}
                          className="flex items-center gap-1 bg-earth-100 dark:bg-basanite-800 px-1.5 py-0.5 text-xs"
                          title={`${s.dimension_key}: ${s.score}/5`}
                        >
                          <span className="text-basanite-400 dark:text-earth-500 truncate max-w-[60px]">{s.dimension_key.split('_')[0]}</span>
                          <span className="font-medium text-basanite-700 dark:text-earth-200">{s.score}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="col-span-1">
                    <span className="text-sm font-display text-gold-600">{a.is_mock ? '-' : avgScore}</span>
                  </div>
                  <div className="col-span-2 text-xs text-basanite-400 dark:text-earth-500">
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

