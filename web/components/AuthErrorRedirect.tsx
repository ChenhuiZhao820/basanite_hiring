'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Detects Supabase auth errors in the URL (query params or hash fragment)
 * and redirects to the login page with a human-readable error message.
 *
 * Supabase redirects to the site root with ?error=... when auth fails
 * (e.g. expired OTP, already-used link).
 */
export function AuthErrorRedirect() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    // Also check the hash fragment, Supabase sometimes puts errors there
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))

    const errorCode = params.get('error_code') || hashParams.get('error_code')
    const errorDesc = params.get('error_description') || hashParams.get('error_description')
    const hasError = params.get('error') || hashParams.get('error')

    if (!hasError) return

    // otp_expired means the link was already consumed (email scanner used it first)
    // but Supabase still verified the email, treat as success
    if (errorCode === 'otp_expired') {
      router.replace('/login?verified=1')
      return
    }

    const message = errorDesc?.replace(/\+/g, ' ') ?? 'Authentication failed.'
    router.replace(`/login?error=${encodeURIComponent(message)}`)
  }, [router])

  return null
}
