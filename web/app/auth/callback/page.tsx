'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { safeNext } from '@/lib/validate'
import { resolveCallbackDestination } from '@/lib/auth-callback-destination'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const next = safeNext(searchParams.get('next'))

    if (!code) {
      router.replace('/login?error=' + encodeURIComponent('Missing verification code. Please check your email link.'))
      return
    }

    const supabase = createClient()

    // Supabase's redirect_to query string isn't reliable for detecting a
    // recovery flow here — confirmed empirically that `next` can be dropped
    // on a successful PKCE recovery exchange even though `code` survives,
    // which silently sent password-reset users to /dashboard instead of
    // /set-password. The PASSWORD_RECOVERY auth event is derived from the
    // session itself rather than the URL, so it isn't subject to that.
    let isRecovery = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') isRecovery = true
    })

    supabase.auth.exchangeCodeForSession(code).then(async ({ error }) => {
      subscription.unsubscribe()
      if (error) {
        const isExpired = error.code === 'otp_expired'
        if (isExpired) {
          // An email scanner may have consumed the code, check if a real session exists.
          // If yes, the user is genuinely verified. If not, the link is just expired.
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            router.replace('/login?verified=1')
          } else {
            router.replace('/login?error=' + encodeURIComponent('Verification link has expired or has already been used. Please request a new one.'))
          }
          return
        }
        router.replace('/login?error=' + encodeURIComponent('Verification link has expired or has already been used. Please sign up again.'))
      } else {
        router.replace(resolveCallbackDestination(next, isRecovery))
      }
    })
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-[#0b1f3d] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Verifying your email…</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  )
}
