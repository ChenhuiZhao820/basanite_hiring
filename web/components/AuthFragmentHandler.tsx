'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { safeNext } from '@/lib/validate'

/**
 * Captures Supabase auth tokens left in the URL fragment on the landing
 * page and finalises the session, then routes the user somewhere useful.
 *
 * Supabase's admin `generate_link` endpoint strips the `redirect_to`
 * query string back to the project's bare Site URL, so a freshly
 * invited / recovered / magic-linked user lands on `/` with the access
 * and refresh tokens in `window.location.hash` instead of on
 * `/auth/callback`. Without this handler the tokens sit unused, the
 * user reads "looks logged-out", and onboarding silently fails (hit
 * this on 2026-06-09 when sending a magic link to a new hirer).
 *
 * Mount this once on the landing page; it's cheap when the fragment is
 * empty and a no-op for normal visitors.
 */
export function AuthFragmentHandler() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (!hash || hash.length < 2) return

    // The fragment looks like `#access_token=…&refresh_token=…&type=…`.
    // Parse defensively — anything we can't recognise we leave alone so
    // we don't break unrelated hash-based navigation elsewhere.
    const params = new URLSearchParams(hash.slice(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    if (!accessToken || !refreshToken) return

    const flowType = params.get('type') || ''
    // `next` is honoured if Supabase preserved it (rare, given the
    // origin-stripping behaviour). safeNext guards against open-redirect
    // values; the fallback is decided per-flow below.
    const explicitNext = safeNext(params.get('next'), '')

    let cancelled = false
    const supabase = createClient()

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          // Token was tampered with, expired, or for a deleted user.
          // Surface a clean error on /login rather than leaving the
          // unusable fragment on the URL.
          window.history.replaceState(null, '', window.location.pathname)
          router.replace(
            '/login?error=' +
              encodeURIComponent('That sign-in link is no longer valid. Request a new one.'),
          )
          return
        }

        // First-time-onboarding flows land on /set-password so the user
        // can pick a password rather than being stuck on a magic-link-
        // only account. Returning users with a session refresh skip
        // straight to /dashboard.
        const onboardingFlow =
          flowType === 'invite' ||
          flowType === 'magiclink' ||
          flowType === 'recovery' ||
          flowType === 'signup'

        // Candidates use a different sign-in path entirely; if a
        // candidate ever did land here, route them out of the hirer
        // dashboard. app_metadata is set server-side, never user-
        // editable, so this can be trusted as an authority check.
        const user = data.session?.user
        const isCandidate = user?.app_metadata?.is_candidate === true

        let target = explicitNext
        if (!target) {
          if (isCandidate) target = '/'
          else if (onboardingFlow) target = '/set-password'
          else target = '/dashboard'
        }

        router.replace(target)
      })
      .catch(() => {
        if (cancelled) return
        window.history.replaceState(null, '', window.location.pathname)
        router.replace('/login?error=' + encodeURIComponent('Sign-in failed. Please try again.'))
      })

    return () => {
      cancelled = true
    }
  }, [router])

  return null
}
