import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { pipelineFetch } from '@/lib/orgs-proxy'
import { DashboardThemeShell } from './DashboardThemeShell'

type Org = { id: string; name: string; description: string | null; role: string }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Resolve workspace switcher data server-side so the org name paints with
  // the rest of the page instead of waiting for client hydration + two extra
  // round-trips. Both calls go to the same FastAPI service so they're cheap.
  const [orgsResp, activeResp] = await Promise.all([
    pipelineFetch(`/orgs?user_id=${encodeURIComponent(user.id)}`),
    pipelineFetch(`/orgs/active?user_id=${encodeURIComponent(user.id)}`),
  ])
  const orgs: Org[] = orgsResp.ok ? (((await orgsResp.json())?.orgs ?? []) as Org[]) : []
  const activeOrgId: string | null = activeResp.ok
    ? ((await activeResp.json())?.active_org_id ?? null)
    : null

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
