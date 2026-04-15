'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const rawNext = searchParams.get('next') ?? '/dashboard'
    // Reject external URLs — only allow internal paths (prevents open redirect)
    const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

    if (!code) {
      router.replace('/login?error=' + encodeURIComponent('Missing verification code. Please check your email link.'))
      return
    }

    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(async ({ error }) => {
      if (error) {
        const isExpired = error.code === 'otp_expired'
        if (isExpired) {
          // An email scanner may have consumed the code — check if a real session exists.
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
      } else if (next === '/dashboard') {
        router.replace('/login?verified=1')
      } else {
        router.replace(next)
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
