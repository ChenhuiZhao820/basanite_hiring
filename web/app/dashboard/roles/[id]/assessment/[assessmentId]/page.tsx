import { createServiceClient, getAuthUserId } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDimensionKey } from '@/lib/format'

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

  // Fetch hirer report
  const { data: report } = await service
    .from('reports')
    .select('*')
    .eq('assessment_id', assessmentId)
    .eq('report_type', 'hirer')
    .single()

  // Fetch interview transcript
  const { data: session } = await service
    .from('interview_sessions')
    .select('messages, current_phase')
    .eq('assessment_id', assessmentId)
    .single()

  const scores = assessment.dimension_scores ?? []
  const content = report?.content ?? {}
  // JSONB messages may come back as a string if the row was written with a stringified
  // payload (legacy), parse defensively so transcripts from older rows still render.
  const rawMessages = session?.messages
  const messages: any[] = Array.isArray(rawMessages)
    ? rawMessages
    : typeof rawMessages === 'string'
      ? (() => { try { return JSON.parse(rawMessages) } catch { return [] } })()
      : []

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

      {assessment.status === 'completed' && (
        <div className="flex flex-wrap gap-2 mb-8">
          <a
            href={`/api/roles/${id}/assessment/${assessmentId}/report/hirer/pdf`}
            className="inline-flex items-center gap-2 bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white text-xs font-medium px-4 py-2 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download hirer report (PDF)
          </a>
          <a
            href={`/api/roles/${id}/assessment/${assessmentId}/report/candidate/pdf`}
            className="inline-flex items-center gap-2 border border-earth-300 dark:border-basanite-700 hover:border-basanite-500 text-basanite-700 dark:text-earth-200 text-xs font-medium px-4 py-2 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Candidate copy (PDF)
          </a>
        </div>
      )}

      {/* Scoring Summary */}
      {scores.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-lg text-basanite-900 dark:text-earth-100 mb-4">Dimension Scores</h2>
          <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 divide-y divide-earth-100">
            {scores.map((s: any) => (
              <div key={s.dimension_key} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-basanite-900 dark:text-earth-100">
                    {formatDimensionKey(s.dimension_key)}
                  </span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <div
                        key={n}
                        className={`w-6 h-6 flex items-center justify-center text-xs font-medium ${
                          n <= (s.score ?? 0)
                            ? 'bg-gold-500 text-white'
                            : 'bg-earth-100 dark:bg-basanite-800 text-basanite-300'
                        }`}
                      >
                        {n}
                      </div>
                    ))}
                  </div>
                </div>
                {s.quotation_basis && (
                  <p className="text-xs text-basanite-500 dark:text-earth-400 italic border-l-2 border-gold-500/30 pl-3 mt-2">
                    &ldquo;{s.quotation_basis}&rdquo;
                  </p>
                )}
                {s.notes && (
                  <p className="text-xs text-basanite-400 dark:text-earth-500 mt-1">{s.notes}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Report Content */}
      {content.top_excerpts && (
        <section className="mb-10">
          <h2 className="font-display text-lg text-basanite-900 dark:text-earth-100 mb-4">Key Interview Excerpts</h2>
          <div className="space-y-4">
            {content.top_excerpts.map((e: any, i: number) => (
              <div key={i} className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5">
                <p className="text-sm text-basanite-800 dark:text-earth-100 mb-2">{e.excerpt}</p>
                <p className="text-xs text-basanite-400 dark:text-earth-500">{e.why_selected}</p>
                {e.dimension && (
                  <span className="text-xs bg-earth-100 dark:bg-basanite-800 text-basanite-500 dark:text-earth-400 px-2 py-0.5 mt-2 inline-block">
                    {formatDimensionKey(e.dimension)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Capability Map */}
      {content.capability_map && (
        <section className="mb-10">
          <h2 className="font-display text-lg text-basanite-900 dark:text-earth-100 mb-4">Technical Capability Map</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {content.capability_map.demonstrated_depth?.length > 0 && (
              <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5">
                <p className="text-xs text-green-600 font-medium uppercase tracking-wide mb-2">Demonstrated Depth</p>
                <ul className="text-sm text-basanite-700 dark:text-earth-200 space-y-1">
                  {content.capability_map.demonstrated_depth.map((d: string, i: number) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
            {content.capability_map.surface_fluency?.length > 0 && (
              <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5">
                <p className="text-xs text-yellow-600 font-medium uppercase tracking-wide mb-2">Surface Fluency</p>
                <ul className="text-sm text-basanite-700 dark:text-earth-200 space-y-1">
                  {content.capability_map.surface_fluency.map((d: string, i: number) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
            {content.capability_map.blind_spots?.length > 0 && (
              <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5">
                <p className="text-xs text-red-500 font-medium uppercase tracking-wide mb-2">Suspected Blind Spots</p>
                <ul className="text-sm text-basanite-700 dark:text-earth-200 space-y-1">
                  {content.capability_map.blind_spots.map((d: string, i: number) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
            {content.capability_map.requires_expert_verification?.length > 0 && (
              <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5">
                <p className="text-xs text-basanite-500 dark:text-earth-400 font-medium uppercase tracking-wide mb-2">Requires Human Verification</p>
                <ul className="text-sm text-basanite-700 dark:text-earth-200 space-y-1">
                  {content.capability_map.requires_expert_verification.map((d: string, i: number) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Comprehensive Assessment */}
      {content.comprehensive_assessment && (
        <section className="mb-10">
          <h2 className="font-display text-lg text-basanite-900 dark:text-earth-100 mb-4">Comprehensive Assessment</h2>
          <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-medium uppercase tracking-wide text-basanite-400 dark:text-earth-500">Cheating Risk:</span>
              <span className={`text-xs font-medium px-2 py-0.5 ${
                content.comprehensive_assessment.cheating_risk === 'low' ? 'bg-green-100 text-green-700' :
                content.comprehensive_assessment.cheating_risk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {content.comprehensive_assessment.cheating_risk}
              </span>
            </div>
            {content.comprehensive_assessment.one_sentence_summary && (
              <p className="text-sm text-basanite-700 dark:text-earth-200 font-display italic">
                &ldquo;{content.comprehensive_assessment.one_sentence_summary}&rdquo;
              </p>
            )}
          </div>
        </section>
      )}

      {/* Transcript */}
      {messages.length > 0 && (
        <section className="mb-10">
          <details>
            <summary className="font-display text-lg text-basanite-900 dark:text-earth-100 mb-4 cursor-pointer hover:text-gold-600 transition-colors">
              Full Interview Transcript ({messages.length} messages)
            </summary>
            <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 divide-y divide-earth-100 mt-4">
              {messages.map((m: any, i: number) => (
                <div key={i} className={`px-5 py-4 ${m.role === 'assistant' ? 'bg-earth-50 dark:bg-basanite-900' : ''}`}>
                  <p className="text-xs text-basanite-400 dark:text-earth-500 font-medium uppercase tracking-wide mb-1">
                    {m.role === 'assistant' ? 'Interviewer' : 'Candidate'}
                  </p>
                  <p className="text-sm text-basanite-700 dark:text-earth-200 whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              ))}
            </div>
          </details>
        </section>
      )}
    </div>
  )
}
