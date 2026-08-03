import { createServiceClient, getAuthUserId } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AssessmentReportTabs } from '@/components/AssessmentReportTabs'

export const metadata = { title: 'Assessment report' }

export default async function AssessmentReportPage({
  params,
}: {
  params: Promise<{ id: string; assessmentId: string }>
}) {
  const { id, assessmentId } = await params
  const userId = await getAuthUserId()
  if (!userId) redirect('/login')

  const service = createServiceClient()

  // Verify ownership
  const { data: role } = await service
    .from('roles')
    .select('id, title, user_id')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!role) redirect('/dashboard')

  // Fetch assessment with all related data
  const { data: assessment } = await service
    .from('assessments')
    .select('*, dimension_scores(*)')
    .eq('id', assessmentId)
    .eq('role_id', id)
    .single()

  if (!assessment) redirect(`/dashboard/roles/${id}`)

  // Fetch both report variants (hirer view + candidate copy). The
  // candidate copy is now viewable on-page, not just downloadable.
  const { data: reportRows } = await service
    .from('reports')
    .select('report_type, content')
    .eq('assessment_id', assessmentId)
    .in('report_type', ['hirer', 'candidate'])

  const hirerContent = reportRows?.find(r => r.report_type === 'hirer')?.content ?? {}
  const candidateContent = reportRows?.find(r => r.report_type === 'candidate')?.content ?? null

  // Fetch interview transcript
  const { data: session } = await service
    .from('interview_sessions')
    .select('messages, current_phase')
    .eq('assessment_id', assessmentId)
    .single()

  const scores = assessment.dimension_scores ?? []

  // JSONB messages may come back as a string if the row was written with a
  // stringified payload (legacy); parse defensively so older transcripts render.
  const rawMessages = session?.messages
  const messages: any[] = Array.isArray(rawMessages)
    ? rawMessages
    : typeof rawMessages === 'string'
      ? (() => { try { return JSON.parse(rawMessages) } catch { return [] } })()
      : []

  // cv_extracted is JSONB; tolerate a double-encoded string from legacy rows.
  const rawCv = assessment.cv_extracted
  const cv = rawCv == null
    ? null
    : typeof rawCv === 'string'
      ? (() => { try { return JSON.parse(rawCv) } catch { return null } })()
      : rawCv

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <Link href={`/dashboard/roles/${id}`} className="text-xs text-basanite-400 dark:text-earth-500 hover:text-basanite-600 dark:hover:text-earth-300 transition-colors mb-4 inline-block">
        &larr; Back to {role.title}
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl text-basanite-900 dark:text-earth-100">{assessment.candidate_name ?? 'Unknown Candidate'}</h1>
          <p className="text-sm text-basanite-500 dark:text-earth-400 mt-1">{assessment.candidate_email}</p>
        </div>
        <div className="text-right">
          <span className={`text-xs px-2 py-1 font-medium ${
            assessment.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-earth-200 text-basanite-500 dark:text-earth-400'
          }`}>
            {assessment.status}
          </span>
          {assessment.experience_path && (
            <p className="text-xs text-basanite-400 dark:text-earth-500 mt-2">
              {assessment.experience_path === 'path_a' ? 'Path A: Relevant Experience' : 'Path B: No Relevant Experience'}
            </p>
          )}
        </div>
      </div>

      {assessment.object_to_automated_decisions && (
        <div className="mb-8 border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-500/60 p-4">
          <div className="flex items-start gap-3">
            <svg className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Human review required (GDPR Article 22)</p>
              <p className="text-xs text-amber-800 dark:text-amber-200 mt-1 leading-relaxed">
                This candidate exercised their right to object to fully automated decision-making. Use these AI scores as input only — apply your own human judgement before acting on them in any consequential hiring decision.
              </p>
            </div>
          </div>
        </div>
      )}

      <AssessmentReportTabs
        roleId={id}
        assessmentId={assessmentId}
        status={assessment.status}
        scores={scores}
        hirerContent={hirerContent}
        candidateContent={candidateContent}
        messages={messages}
        cv={cv}
        startedAt={assessment.started_at ?? null}
        completedAt={assessment.completed_at ?? null}
        hirerPdfHref={`/api/roles/${id}/assessment/${assessmentId}/report/hirer/pdf`}
        candidatePdfHref={`/api/roles/${id}/assessment/${assessmentId}/report/candidate/pdf`}
      />
    </div>
  )
}
