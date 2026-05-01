import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardThemeShell } from './DashboardThemeShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <DashboardThemeShell email={user.email ?? ''} isAdmin={!!user.app_metadata?.is_admin}>
      {children}
    </DashboardThemeShell>
  )
}
