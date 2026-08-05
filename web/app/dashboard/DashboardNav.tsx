'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardNav({ isAdmin }: { isAdmin?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [needsAttention, setNeedsAttention] = useState(false)

  // Red-dot badge on the Admin link: pending waitlist requests or security
  // events the admin hasn't reviewed yet. Re-checked on navigation so the
  // dot clears promptly after the admin deals with the queue.
  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/admin/notifications')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) setNeedsAttention((data.pending_waitlist ?? 0) > 0 || (data.new_security_events ?? 0) > 0)
      })
      .catch(() => {/* badge is best-effort */})
  }, [isAdmin, pathname])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isDashboard = pathname === '/dashboard'
  const isAccount = pathname === '/dashboard/account'
  const isIntegrations = pathname === '/dashboard/integrations'
  const isVoices = pathname?.startsWith('/dashboard/voices') ?? false

  return (
    <div className="flex items-center gap-1">
      <Link
        href="/dashboard"
        className={`text-xs px-3 py-1.5 transition-colors ${
          isDashboard
            ? 'text-[#1a1a18] dark:text-earth-100 font-medium'
            : 'text-slate-400 dark:text-earth-500 hover:text-[#1a1a18] dark:hover:text-earth-100'
        }`}
      >
        Dashboard
      </Link>
      <span className="text-slate-200 dark:text-basanite-700 text-xs">|</span>
      <Link
        href="/dashboard/voices"
        className={`text-xs px-3 py-1.5 transition-colors ${
          isVoices
            ? 'text-[#1a1a18] dark:text-earth-100 font-medium'
            : 'text-slate-400 dark:text-earth-500 hover:text-[#1a1a18] dark:hover:text-earth-100'
        }`}
      >
        Voices
      </Link>
      <span className="text-slate-200 dark:text-basanite-700 text-xs">|</span>
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
        Account settings
      </Link>
      {isAdmin && (
        <>
          <span className="text-slate-200 dark:text-basanite-700 text-xs">|</span>
          <Link
            href="/dashboard/admin"
            className="relative text-xs text-slate-400 dark:text-earth-500 hover:text-[#1a1a18] dark:hover:text-earth-100 px-3 py-1.5 transition-colors"
          >
            Admin
            {needsAttention && (
              <span
                className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-500"
                aria-label="Admin items need attention"
              />
            )}
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
