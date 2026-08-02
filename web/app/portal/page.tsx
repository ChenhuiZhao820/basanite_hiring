import { createServiceClient, getAuthUserId, getAuthUserEmail } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogoMark } from '@/components/Logo'

export const metadata = { title: 'My applications' }

type StepState = 'done' | 'active' | 'todo'

// Map an assessment row to the candidate-facing progress steps.
function progressSteps(status: string, hasReport: boolean): Array<{ label: string; state: StepState }> {
  const interviewDone = status === 'completed'
  const interviewActive = status === 'in_progress'
  return [
    { label: 'Applied', state: 'done' },
    {
      label: 'AI interview',
      state: interviewDone ? 'done' : interviewActive ? 'active' : status === 'abandoned' ? 'todo' : 'active',
    },
    { label: 'Feedback ready', state: hasReport ? 'done' : 'todo' },
  ]
}

function statusLabel(status: string, hasReport: boolean): { text: string; tone: string } {
  if (status === 'completed' && hasReport) return { text: 'Feedback ready', tone: 'bg-green-100 text-green-700' }
  if (status === 'completed') return { text: 'Interview completed — feedback generating', tone: 'bg-green-100 text-green-700' }
  if (status === 'in_progress') return { text: 'Interview in progress', tone: 'bg-yellow-100 text-yellow-700' }
  if (status === 'abandoned') return { text: 'Interview not finished', tone: 'bg-red-50 text-red-500' }
  return { text: 'CV uploaded — interview pending', tone: 'bg-earth-200 text-basanite-600' }
}

export default async function PortalPage() {
  const userId = await getAuthUserId()
  if (!userId) redirect('/login?next=/portal')
  const email = await getAuthUserEmail()

  const service = createServiceClient()
  const { data: assessments } = await service
    .from('assessments')
    .select('id, status, created_at, completed_at, candidate_name, roles(title, company_name, status), reports(report_type)')
    .eq('candidate_user_id', userId)
    .order('created_at', { ascending: false })

  const applications = (assessments ?? []).map((a: any) => {
    const role = Array.isArray(a.roles) ? a.roles[0] : a.roles
    const hasReport = (a.reports ?? []).some((r: any) => r.report_type === 'candidate')
    return { ...a, role, hasReport }
  })

  return (
    <div className="min-h-screen bg-earth-50">
      <nav className="border-b border-earth-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center">
            <LogoMark size={24} dark />
            <span className="font-display text-basanite-900 text-sm ml-2">Basanite</span>
          </a>
          <div className="flex items-center gap-4">
            {email && <span className="text-xs text-basanite-400 hidden sm:inline">{email}</span>}
            <a href="/logout" className="text-xs text-basanite-500 hover:text-basanite-900 transition-colors">
              Sign out
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display text-3xl text-basanite-900 mb-2">My Applications</h1>
        <p className="text-sm text-basanite-500 mb-10">
          Every role you&apos;ve applied to through Basanite, with your interview progress and feedback.
        </p>

        {applications.length === 0 ? (
          <div className="bg-white border border-earth-200 p-10 text-center">
            <p className="text-basanite-500 text-sm">You haven&apos;t applied to any roles yet.</p>
            <p className="text-basanite-400 text-xs mt-2">
              When a company sends you a Basanite application link, your interviews will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {applications.map((a: any) => {
              const label = statusLabel(a.status, a.hasReport)
              const steps = progressSteps(a.status, a.hasReport)
              return (
                <div key={a.id} className="bg-white border border-earth-200 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                    <div>
                      <h2 className="font-display text-lg text-basanite-900">{a.role?.title ?? 'Role'}</h2>
                      {a.role?.company_name && (
                        <p className="text-sm text-basanite-500 mt-0.5">{a.role.company_name}</p>
                      )}
                      <p className="text-xs text-basanite-400 mt-1">
                        Applied {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs px-3 py-1 font-medium ${label.tone}`}>{label.text}</span>
                  </div>

                  {/* Progress steps */}
                  <div className="flex items-center gap-0 mb-5">
                    {steps.map((s, i) => (
                      <div key={s.label} className="flex items-center flex-1 last:flex-none">
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${
                              s.state === 'done'
                                ? 'bg-gold-500 text-white'
                                : s.state === 'active'
                                  ? 'border-2 border-gold-500 text-gold-600'
                                  : 'border border-earth-300 text-basanite-300'
                            }`}
                          >
                            {s.state === 'done' ? (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            ) : (
                              i + 1
                            )}
                          </span>
                          <span className={`text-xs ${s.state === 'todo' ? 'text-basanite-300' : 'text-basanite-700'}`}>
                            {s.label}
                          </span>
                        </div>
                        {i < steps.length - 1 && <div className="flex-1 h-px bg-earth-200 mx-3" />}
                      </div>
                    ))}
                  </div>

                  {/* Feedback download — one PDF per interview */}
                  {a.hasReport && (
                    <a
                      href={`/api/portal/assessments/${a.id}/report/pdf`}
                      className="inline-flex items-center gap-2 bg-basanite-900 hover:bg-gold-600 text-white text-xs font-medium px-4 py-2 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download feedback (PDF)
                    </a>
                  )}
                  {a.status === 'completed' && !a.hasReport && (
                    <p className="text-xs text-basanite-400">
                      Your feedback report is being generated — check back shortly.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
