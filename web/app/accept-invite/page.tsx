'use client'

// Token-gated org-invitation acceptance. Public route — must be signed
// in to accept; if not, redirect to /login with a next= param so the
// invitee lands back here after login.

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogoMark } from '@/components/Logo'
import { LegalFooter } from '@/components/LegalFooter'
import { createClient } from '@/lib/supabase/client'

type Phase = 'loading' | 'needs_signin' | 'ready' | 'accepting' | 'accepted' | 'error'

export default function AcceptInvitePage() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const [phase, setPhase] = useState<Phase>('loading')
  const [orgName, setOrgName] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setPhase('error'); setError('Invitation link is missing its token.'); return }
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        setPhase('needs_signin')
        return
      }
      setPhase('ready')
    })()
    return () => { cancelled = true }
  }, [token])

  async function accept() {
    if (phase !== 'ready') return
    setPhase('accepting')
    setError('')
    try {
      const res = await fetch('/api/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail ?? `Failed (${res.status})`)
      }
      const data = await res.json()
      setOrgName(data?.org_name ?? null)
      setPhase('accepted')
      // Hard navigate so server components on /dashboard re-resolve under
      // the new active org.
      setTimeout(() => { window.location.href = '/dashboard' }, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to accept')
      setPhase('error')
    }
  }

  return (
    <div className="min-h-screen bg-earth-50 flex flex-col">
      <header className="border-b border-earth-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={24} dark />
            <span className="font-semibold text-basanite-900 text-sm">Basanite</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-earth-200 p-8">
          {phase === 'loading' && (
            <p className="text-sm text-basanite-600">Loading invitation…</p>
          )}
          {phase === 'needs_signin' && (
            <>
              <h1 className="font-display text-2xl text-basanite-900 mb-3">Sign in to accept</h1>
              <p className="text-sm text-basanite-700 mb-6">
                You&rsquo;ve been invited to join an organisation on Basanite. Sign in (or sign up if you don&rsquo;t have an account yet) and we&rsquo;ll bring you back here.
              </p>
              <Link
                href={`/login?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
                className="inline-block px-5 py-2.5 bg-basanite-900 hover:bg-gold-600 text-white text-sm font-medium transition-colors"
              >
                Continue to sign in
              </Link>
            </>
          )}
          {phase === 'ready' && (
            <>
              <h1 className="font-display text-2xl text-basanite-900 mb-3">Accept your invitation</h1>
              <p className="text-sm text-basanite-700 mb-6">
                Joining will give you access to the organisation&rsquo;s shared roles, candidate pipelines, cloned interviewer voices, and ATS connections.
              </p>
              <button
                onClick={accept}
                className="px-5 py-2.5 bg-basanite-900 hover:bg-gold-600 text-white text-sm font-medium transition-colors"
              >
                Accept invitation
              </button>
            </>
          )}
          {phase === 'accepting' && (
            <p className="text-sm text-basanite-600">Joining the organisation…</p>
          )}
          {phase === 'accepted' && (
            <>
              <h1 className="font-display text-2xl text-basanite-900 mb-3">You&rsquo;re in.</h1>
              <p className="text-sm text-basanite-700">
                {orgName ? `Welcome to ${orgName}. ` : ''}Taking you to the dashboard…
              </p>
            </>
          )}
          {phase === 'error' && (
            <>
              <h1 className="font-display text-2xl text-basanite-900 mb-3">Couldn&rsquo;t accept</h1>
              <p className="text-sm text-red-700 mb-6">{error || 'The invitation may have expired, been cancelled, or already been accepted.'}</p>
              <Link href="/dashboard" className="text-sm text-gold-600 underline">Go to dashboard</Link>
            </>
          )}
        </div>
      </main>

      <div className="max-w-2xl mx-auto w-full px-6">
        <LegalFooter />
      </div>
    </div>
  )
}
