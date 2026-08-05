'use client'

// Invited-candidate landing page (hirer email invites + ATS auto-invites).
//
// The invite link `/assess/invite/{token}` is unique per candidate. The
// flow is auth-first:
//   1. Resolve the invite to role info via /api/assess/invite/{token}
//      (unauthenticated — shows role title/company/duration only; ENG-30
//      keeps candidate identity out of this response).
//   2. If the visitor isn't signed in, show an inline sign-up/sign-in
//      form. The account email must match the invited email — the claim
//      endpoint enforces this server-side.
//   3. Claim the invite (binds candidate_user_id to the signed-in user),
//      then send them to their portal, where the interview appears as a
//      pending application they can start when ready.

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogoMark } from '@/components/Logo'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

type Invite = {
  assessment_id: string
  role_token: string
  role_title: string
  company_name: string | null
  dimensions_count: number
  interview_duration_minutes: number
  cv_prefilled: boolean
}

export default function InviteLandingPage() {
  useDocumentTitle('Interview invite')
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [invite, setInvite] = useState<Invite | null>(null)
  const [fatalError, setFatalError] = useState('')
  const [authed, setAuthed] = useState<boolean | null>(null)

  const [isSignUp, setIsSignUp] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)
  const [claiming, setClaiming] = useState(false)

  // Resolve the invite + detect an existing session in parallel.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/assess/invite/${encodeURIComponent(String(token))}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.detail ?? `This invite isn't valid (${res.status}).`)
        }
        const data: Invite = await res.json()
        if (!cancelled) setInvite(data)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load invite.'
        if (!cancelled) setFatalError(msg)
      }
    })()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!cancelled) setAuthed(Boolean(user))
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function claimInvite(): Promise<void> {
    setFormError('')
    setClaiming(true)
    try {
      const res = await fetch(`/api/assess/invite/${encodeURIComponent(String(token))}/claim`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.detail ?? data.error ?? 'Failed to claim this invite.')
      }
      router.push('/portal')
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to claim this invite.')
      setClaiming(false)
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setLoading(true)
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name, is_candidate: true } },
        })
        if (error) throw error
        // Supabase returns a fake user with empty identities when the email
        // already exists (does not reveal existence to clients). Detect that
        // and tell the user to sign in instead of silently proceeding.
        const emailExists = data.user && (!data.user.identities || data.user.identities.length === 0)
        if (emailExists) {
          setFormError('That email is already registered. Sign in below instead.')
          setIsSignUp(false)
          return
        }
        await fetch('/api/auth/tag-candidate', { method: 'POST' }).catch(() => {})
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
      setAuthed(true)
      await claimInvite()
    } catch (e: any) {
      setFormError(e.message ?? 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setFormError('Enter your email above, then click the reset link.')
      return
    }
    setFormError('')
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirect_to: `${window.location.origin}/auth/callback?next=/set-password`,
        }),
      })
    } catch {
      // Network error — the user can retry. No upstream details leaked.
    }
    setFormError('Check your inbox for a password reset link.')
  }

  async function handleSwitchAccount() {
    await supabase.auth.signOut()
    setAuthed(false)
    setFormError('')
  }

  if (fatalError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-earth-50 p-6">
        <div className="max-w-md w-full bg-white border border-earth-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <LogoMark size={22} dark />
            <span className="font-display text-basanite-900 text-sm">Basanite</span>
          </div>
          <h1 className="font-display text-lg text-basanite-900 mb-2">Invite unavailable</h1>
          <p className="text-sm text-slate-600">{fatalError}</p>
          <p className="text-xs text-slate-400 mt-4">
            If you think this is a mistake, reach out to the team that invited you and ask
            them to resend the link.
          </p>
        </div>
      </div>
    )
  }

  if (!invite || authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-earth-50">
        <div className="text-sm text-slate-500">Loading your invite…</div>
      </div>
    )
  }

  // ENG-30: greeting is generic — the invite endpoint doesn't return
  // candidate_name to anyone holding the URL. The candidate's real name
  // is shown after sign-in, when ownership is verified.
  const where = invite.company_name
    ? `${invite.role_title} at ${invite.company_name}`
    : invite.role_title

  return (
    <div className="min-h-screen flex items-center justify-center bg-earth-50 p-6">
      <div className="max-w-xl w-full bg-white border border-earth-200 p-8">
        <div className="flex items-center gap-2 mb-6">
          <LogoMark size={22} dark />
          <span className="font-display text-basanite-900 text-sm">Basanite</span>
        </div>

        <h1 className="font-display text-2xl text-basanite-900 mb-2">Hi,</h1>
        <p className="text-base text-slate-700 mb-6">
          You&apos;ve been invited to interview for <strong>{where}</strong>.
          {invite.cv_prefilled
            ? ' Your application and CV came directly from their hiring system, so we already have everything we need to start.'
            : ' Sign in below to add it to your portal — you can start whenever you\u2019re ready.'}
        </p>

        <div className="border-l-2 border-gold-400 bg-earth-50 px-4 py-3 mb-6">
          <p className="text-sm text-slate-600 mb-1">
            <strong className="text-basanite-900">{invite.interview_duration_minutes} minutes</strong>{' '}
            · conversational, no scripted questions
          </p>
          <p className="text-xs text-slate-500">
            You&apos;ll talk to an AI interviewer about your real experience. The more
            specific you can be, the better the report.
          </p>
        </div>

        {formError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 mb-4">{formError}</div>
        )}

        {authed ? (
          <div>
            <button
              onClick={claimInvite}
              disabled={claiming}
              className="bg-basanite-900 hover:bg-gold-600 text-white font-medium px-6 py-3 transition-colors disabled:opacity-60"
            >
              {claiming ? 'Adding to your portal…' : 'Continue to your portal'}
            </button>
            <p className="text-xs text-slate-400 mt-3">
              Signed in with a different account than the one this invite was sent to?{' '}
              <button onClick={handleSwitchAccount} className="text-gold-600 hover:underline">
                Switch account
              </button>
            </p>
          </div>
        ) : (
          <div className="border-t border-earth-200 pt-6">
            <h2 className="font-display text-lg text-basanite-900 mb-1">
              {isSignUp ? 'Create your account' : 'Sign in'}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Use the email address this invite was sent to — the invite is tied to it.
            </p>

            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required={isSignUp}
                    className="w-full border border-earth-300 bg-white px-4 py-2.5 text-sm text-basanite-900 placeholder-basanite-400 outline-none focus:border-gold-500 transition-colors"
                    placeholder="Jane Smith"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full border border-earth-300 bg-white px-4 py-2.5 text-sm text-basanite-900 placeholder-basanite-400 outline-none focus:border-gold-500 transition-colors"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full border border-earth-300 bg-white px-4 py-2.5 text-sm text-basanite-900 placeholder-basanite-400 outline-none focus:border-gold-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading || claiming}
                className="w-full bg-basanite-900 hover:bg-gold-600 text-white font-medium py-2.5 text-sm transition-colors disabled:opacity-60"
              >
                {loading || claiming ? 'Please wait…' : isSignUp ? 'Create Account & Continue' : 'Sign In & Continue'}
              </button>
            </form>

            <p className="text-xs text-slate-400 text-center mt-4">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button onClick={() => { setIsSignUp(!isSignUp); setFormError('') }} className="text-gold-600 hover:underline">
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
            {!isSignUp && (
              <p className="text-xs text-slate-400 text-center mt-2">
                <button type="button" onClick={handleForgotPassword} className="text-gold-600 hover:underline">
                  Forgot password?
                </button>
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-slate-400 mt-6">
          This invite link is unique to you — please don&apos;t share it.
        </p>
      </div>
    </div>
  )
}
