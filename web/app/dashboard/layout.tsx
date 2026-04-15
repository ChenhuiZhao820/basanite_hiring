import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogoMark } from '@/components/Logo'
import DashboardNav from './DashboardNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-earth-50">
      <nav className="bg-white border-b border-earth-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href="/dashboard" className="flex items-center gap-2">
            <LogoMark size={24} dark />
            <span className="font-semibold text-basanite-900 text-sm">Basanite</span>
          </a>
          <DashboardNav email={user.email ?? ''} isAdmin={!!user.app_metadata?.is_admin} />
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  )
}
