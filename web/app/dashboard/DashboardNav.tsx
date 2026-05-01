'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardNav({ email, isAdmin }: { email: string; isAdmin?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isAccount = pathname === '/dashboard/account'
  const isIntegrations = pathname === '/dashboard/integrations'

  return (
    <div className="flex items-center gap-1">
      <Link
        href="/dashboard/integrations"
        className={`text-xs px-3 py-1.5 transition-colors ${
          isIntegrations
            ? 'text-[#1a1a18] dark:text-earth-100 font-medium'
            : 'text-slate-400 dark:text-earth-500 hover:text-[#1a1a18] dark:hover:text-earth-100'
        }`}
      >
        Integrations
      </Link>
      <span className="text-slate-200 dark:text-basanite-700 text-xs">|</span>
      <Link
        href="/dashboard/account"
        className={`text-xs px-3 py-1.5 transition-colors ${
          isAccount
            ? 'text-[#1a1a18] dark:text-earth-100 font-medium'
            : 'text-slate-400 dark:text-earth-500 hover:text-[#1a1a18] dark:hover:text-earth-100'
        }`}
      >
        {email}
      </Link>
      {isAdmin && (
        <>
          <span className="text-slate-200 dark:text-basanite-700 text-xs">|</span>
          <Link
            href="/dashboard/admin"
            className="text-xs text-slate-400 dark:text-earth-500 hover:text-[#1a1a18] dark:hover:text-earth-100 px-3 py-1.5 transition-colors"
          >
            Admin
          </Link>
        </>
      )}
      <span className="text-slate-200 dark:text-basanite-700 text-xs">|</span>
      <button
        onClick={signOut}
        className="text-xs text-slate-400 dark:text-earth-500 hover:text-[#1a1a18] dark:hover:text-earth-100 px-3 py-1.5 transition-colors"
      >
        Sign out
      </button>
    </div>
  )
}
