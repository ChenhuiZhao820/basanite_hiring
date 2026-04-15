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

  return (
    <div className="flex items-center gap-1">
      <Link
        href="/dashboard/account"
        className={`text-xs px-3 py-1.5 transition-colors ${
          isAccount
            ? 'text-[#1a1a18] font-medium'
            : 'text-slate-400 hover:text-[#1a1a18]'
        }`}
      >
        {email}
      </Link>
      {isAdmin && (
        <>
          <span className="text-slate-200 text-xs">|</span>
          <Link
            href="/dashboard/admin"
            className="text-xs text-slate-400 hover:text-[#1a1a18] px-3 py-1.5 transition-colors"
          >
            Admin
          </Link>
        </>
      )}
      <span className="text-slate-200 text-xs">|</span>
      <button
        onClick={signOut}
        className="text-xs text-slate-400 hover:text-[#1a1a18] px-3 py-1.5 transition-colors"
      >
        Sign out
      </button>
    </div>
  )
}
