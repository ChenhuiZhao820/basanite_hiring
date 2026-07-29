import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { pipelineFetch } from '@/lib/orgs-proxy'
import { DashboardThemeShell } from './DashboardThemeShell'

type Org = { id: string; name: string; description: string | null; role: string }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  console.error('[DIAG] layout: start')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.error('[DIAG] layout: getUser done, user =', !!user)
  if (!user) redirect('/login')

  // Resolve workspace switcher data server-side so the org name paints with
  // the rest of the page instead of waiting for client hydration + two extra
  // round-trips. Both calls go to the same FastAPI service.
  //
  // This data is non-critical page chrome. A slow or unreachable backend must
  // never hang the whole dashboard render — on Vercel that surfaces as a
  // FUNCTION_INVOCATION_TIMEOUT (504) and locks the user out entirely. So we
  // cap the calls with a short abort timeout and degrade to an empty switcher
  // on any failure, letting the rest of the dashboard load normally.
  let orgs: Org[] = []
  let activeOrgId: string | null = null
  try {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 4000)
    try {
      const [orgsResp, activeResp] = await Promise.all([
        pipelineFetch(`/orgs?user_id=${encodeURIComponent(user.id)}`, { signal: ctrl.signal }),
        pipelineFetch(`/orgs/active?user_id=${encodeURIComponent(user.id)}`, { signal: ctrl.signal }),
      ])
      orgs = orgsResp.ok ? (((await orgsResp.json())?.orgs ?? []) as Org[]) : []
      activeOrgId = activeResp.ok ? ((await activeResp.json())?.active_org_id ?? null) : null
    } finally {
      clearTimeout(timeout)
    }
  } catch (err) {
    console.error('[dashboard/layout] workspace switcher load failed; rendering empty:', err)
  }
  console.error('[DIAG] layout: org block done, orgs =', orgs.length)

  return (
    <DashboardThemeShell
      email={user.email ?? ''}
      isAdmin={!!user.app_metadata?.is_admin}
      initialOrgs={orgs}
      initialActiveOrgId={activeOrgId}
    >
      {children}
    </DashboardThemeShell>
  )
}
