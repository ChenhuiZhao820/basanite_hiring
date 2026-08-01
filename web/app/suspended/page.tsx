'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogoMark } from '@/components/Logo'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

// Landing page for suspended accounts. Users are redirected here by the
// middleware; the only ways out are contacting support (admin review +
// reinstate) or signing out.
export default function SuspendedPage() {
  useDocumentTitle('Account suspended')
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-earth-50 dark:bg-basanite-950 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white dark:bg-basanite-900 border border-earth-200 dark:border-basanite-700 p-8 text-center">
        <div className="flex justify-center mb-6">
          <LogoMark size={32} dark />
        </div>
        <h1 className="font-display text-2xl text-basanite-900 dark:text-earth-100 mb-3">
          Account suspended
        </h1>
        <p className="text-sm text-basanite-500 dark:text-earth-400 mb-6 leading-relaxed">
          Your account has been suspended pending review. If you believe this
          is a mistake, contact{' '}
          <a href="mailto:support@basanite.co.uk" className="text-gold-600 dark:text-gold-400 hover:underline">
            support@basanite.co.uk
          </a>{' '}
          and our team will look into it.
        </p>
        <button
          onClick={handleSignOut}
          className="w-full bg-basanite-900 dark:bg-gold-500 text-white dark:text-basanite-950 hover:bg-gold-600 dark:hover:bg-gold-400 font-medium py-2.5 text-sm transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
