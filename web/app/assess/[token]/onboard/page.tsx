'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogoMark } from '@/components/Logo'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

export default function OnboardPage() {
  useDocumentTitle('Onboarding')
  const router = useRouter()
  const { token } = useParams<{ token: string }>()
  const supabase = createClient()

  const [step, setStep] = useState<'auth' | 'cv'>('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [cvText, setCvText] = useState('')
  const [cvFileName, setCvFileName] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(true)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // DEV-ONLY local-testing bypass. Lets you skip Supabase sign-up/sign-in
  // when the browser anon key isn't configured locally. Gated by a
  // gitignored env flag; never set this in production. Do not commit the flag.
  const TEST_BYPASS = process.env.NEXT_PUBLIC_ALLOW_TEST_CANDIDATE === '1'

  // Already signed in (returning candidate, or an invited one arriving from
  // their portal): skip the auth step and go straight to the CV upload,
  // seeding name/email from the session so handleCVSubmit has them.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled || !user) return
      setName(prev => prev || user.user_metadata?.full_name || '')
      setEmail(prev => prev || user.email || '')
      setStep(prev => (prev === 'auth' ? 'cv' : prev))
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function isPdf(file: File) {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    if (uploading) return
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (!isPdf(file)) {
      setError('That file isn\u2019t a PDF. Basanite only accepts PDF CVs.')
      return
    }
    void handleCVFile(file)
  }

  async function handleCVFile(file: File) {
    setError('')
    const MAX_CV_BYTES = 10 * 1024 * 1024
    if (file.size > MAX_CV_BYTES) {
      setError('That file is too large. Please upload a PDF under 10 MB.')
      setCvFileName(null)
      return
    }
    setUploading(true)
    setCvFileName(file.name)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/assess/${token}/cv-upload`, { method: 'POST', body: form })
      const data = await res.json().catch(() => ({} as any))
      // FastAPI errors arrive as { detail }, the Next.js proxy layer
      // (auth / rate-limit) as { error } — read both so the real reason
      // isn't masked by a generic fallback.
      if (!res.ok) throw new Error(data.detail ?? data.error ?? 'We couldn\'t read that file.')
      setCvText(data.cv_text ?? '')
    } catch (e: any) {
      setError(e.message ?? 'Failed to read that file.')
      setCvFileName(null)
    } finally {
      setUploading(false)
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setError('')
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
        // and tell the user to sign in or reset instead of silently proceeding.
        const emailExists = data.user && (!data.user.identities || data.user.identities.length === 0)
        if (emailExists) {
          setError('That email is already registered. Sign in below, or use the reset link.')
          setIsSignUp(false)
          return
        }
        // Real new user, tag them as a candidate.
        await fetch('/api/auth/tag-candidate', { method: 'POST' }).catch(() => {})
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
      setStep('cv')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError('Enter your email above, then click the reset link.')
      return
    }
    setError('')
    setLoading(true)
    // ENG-58: route through the rate-limited Next.js endpoint instead
    // of calling supabase.auth.resetPasswordForEmail directly, so a
    // script can't spam the victim's inbox before Supabase's per-user
    // cap kicks in. The endpoint always returns 200 to prevent
    // account-existence enumeration.
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
      // Network error — the user can retry. We don't surface upstream
      // error details so we don't leak account state.
    }
    setLoading(false)
    setError('Check your inbox for a password reset link.')
  }

  async function handleCVSubmit() {
    if (!cvText.trim()) {
      setError('Please upload your CV first.')
      return
    }
    setError('')
    setLoading(true)

    try {
      let candidateUserId: string
      let candidateName: string
      let candidateEmail: string

      if (TEST_BYPASS) {
        // DEV-ONLY: no real session. Use a random UUID as the candidate id
        // (the column is a uuid) so each test run creates a fresh assessment
        // and avoids the one-active-per-candidate 409. The server bypass
        // ignores the user-id match.
        candidateUserId = crypto.randomUUID()
        candidateName = name || 'Test Candidate'
        candidateEmail = email || 'test@local.test'
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')
        candidateUserId = user.id
        candidateName = name || user.user_metadata?.full_name || email.split('@')[0]
        candidateEmail = email || user.email || ''
      }

      const res = await fetch(`/api/assess/${token}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_user_id: candidateUserId,
          candidate_name: candidateName,
          candidate_email: candidateEmail,
          cv_text: cvText,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any))
        // Backend (FastAPI) errors are { detail }; the proxy layer's own
        // errors are { error }. Surface whichever is present so the
        // candidate sees the real cause (e.g. "Assessment not found or not
        // active", "An assessment already exists") instead of a generic line.
        throw new Error(data.detail || data.error || 'Failed to start assessment')
      }

      const data = await res.json()
      // Store assessment_id for interview page
      sessionStorage.setItem(`assessment_${token}`, data.assessment_id)

      // Persist any consents the candidate gave on the /consent screen.
      // We do this best-effort — if it fails the interview should still
      // proceed; the missing audit trail will be flagged in retention sweep.
      try {
        const raw = sessionStorage.getItem(`consent_${token}`)
        if (raw) {
          const consents = JSON.parse(raw)
          await fetch('/api/consent/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assessment_id: data.assessment_id, consents }),
          })
        }
      } catch (e) {
        console.error('[consent log] non-fatal:', e)
      }

      router.push(`/assess/${token}/check`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-earth-50 dark:bg-basanite-950 flex flex-col">
      <nav className="border-b border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-900">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center">
          <LogoMark size={24} dark />
          <span className="font-display text-basanite-900 dark:text-earth-100 text-sm ml-2">Basanite</span>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-lg w-full">
          {error && (
            <div className="text-sm text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/40 px-4 py-3 mb-6">{error}</div>
          )}

          {step === 'auth' && (
            <div className="bg-white dark:bg-basanite-900 border border-earth-200 dark:border-basanite-700 p-8">
              <h1 className="font-display text-2xl text-basanite-900 dark:text-earth-100 mb-2">
                {isSignUp ? 'Create your account' : 'Sign in'}
              </h1>
              <p className="text-basanite-500 dark:text-earth-200/60 text-sm mb-6">
                {isSignUp ? 'To begin the assessment, create a Basanite account.' : 'Sign in to continue your assessment.'}
              </p>

              {TEST_BYPASS && (
                <div className="mb-6 border border-dashed border-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3">
                  <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                    Local test mode — skip account creation and go straight to the CV step.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setError(''); setStep('cv') }}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 text-sm transition-colors"
                  >
                    Skip login (local test)
                  </button>
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="block text-xs font-medium text-basanite-600 dark:text-earth-200/80 mb-1.5 uppercase tracking-wide">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required={isSignUp}
                      className="w-full border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 px-4 py-2.5 text-sm text-basanite-900 dark:text-earth-100 placeholder-basanite-400 dark:placeholder-earth-200/40 outline-none focus:border-gold-500 dark:focus:border-gold-500 transition-colors"
                      placeholder="Jane Smith"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-basanite-600 dark:text-earth-200/80 mb-1.5 uppercase tracking-wide">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 px-4 py-2.5 text-sm text-basanite-900 dark:text-earth-100 placeholder-basanite-400 dark:placeholder-earth-200/40 outline-none focus:border-gold-500 dark:focus:border-gold-500 transition-colors"
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-basanite-600 dark:text-earth-200/80 mb-1.5 uppercase tracking-wide">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 px-4 py-2.5 text-sm text-basanite-900 dark:text-earth-100 placeholder-basanite-400 dark:placeholder-earth-200/40 outline-none focus:border-gold-500 dark:focus:border-gold-500 transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-basanite-900 dark:bg-gold-500 text-white dark:text-basanite-950 hover:bg-gold-600 dark:hover:bg-gold-400 font-medium py-2.5 text-sm transition-colors disabled:opacity-60"
                >
                  {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              <p className="text-xs text-basanite-400 dark:text-earth-200/40 text-center mt-4">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button onClick={() => setIsSignUp(!isSignUp)} className="text-gold-600 dark:text-gold-400 hover:underline">
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </p>
              {!isSignUp && (
                <p className="text-xs text-basanite-400 dark:text-earth-200/40 text-center mt-2">
                  <button type="button" onClick={handleForgotPassword} className="text-gold-600 dark:text-gold-400 hover:underline">
                    Forgot password?
                  </button>
                </p>
              )}
            </div>
          )}

          {step === 'cv' && (
            <div className="bg-white dark:bg-basanite-900 border border-earth-200 dark:border-basanite-700 p-8">
              <h1 className="font-display text-2xl text-basanite-900 dark:text-earth-100 mb-2">Upload your CV</h1>
              <p className="text-basanite-500 dark:text-earth-200/60 text-sm mb-6">
                We use this to personalise your interview.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) void handleCVFile(f)
                  e.target.value = ''
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full bg-basanite-900 dark:bg-gold-500 text-white dark:text-basanite-950 hover:bg-gold-600 dark:hover:bg-gold-400 font-medium py-3 text-sm transition-colors disabled:opacity-60 mb-3"
              >
                {uploading ? 'Reading your PDF…' : cvFileName ? `Replace: ${cvFileName}` : 'Choose a PDF file'}
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-earth-200 dark:bg-basanite-700" />
                <span className="text-xs text-basanite-400 dark:text-earth-200/40 uppercase tracking-wide">or</span>
                <div className="flex-1 h-px bg-earth-200 dark:bg-basanite-700" />
              </div>

              <div
                onDragOver={e => { e.preventDefault(); if (!uploading) setDragActive(true) }}
                onDragEnter={e => { e.preventDefault(); if (!uploading) setDragActive(true) }}
                onDragLeave={e => { e.preventDefault(); setDragActive(false) }}
                onDrop={handleDrop}
                className={`w-full border border-dashed text-center text-basanite-700 dark:text-earth-200 text-sm py-10 px-4 transition-colors ${
                  dragActive
                    ? 'border-gold-500 bg-gold-50 dark:bg-gold-500/10'
                    : 'border-earth-300 dark:border-basanite-700'
                } ${uploading ? 'opacity-60' : ''}`}
              >
                {dragActive ? 'Drop your file here' : 'Drag your file here'}
              </div>

              <p className="text-xs text-basanite-400 dark:text-earth-200/40 mt-3">
                Supported file format: PDF
              </p>

              {cvText && cvFileName && (
                <p className="text-xs text-basanite-400 dark:text-earth-200/40 mt-2">
                  Loaded {cvFileName}, {cvText.length.toLocaleString()} characters.
                </p>
              )}

              <button
                onClick={handleCVSubmit}
                disabled={loading || uploading || !cvText.trim()}
                className="w-full bg-basanite-900 dark:bg-gold-500 text-white dark:text-basanite-950 hover:bg-gold-600 dark:hover:bg-gold-400 font-medium py-3 text-sm transition-colors disabled:opacity-60 mt-6"
              >
                {loading ? 'Processing your CV…' : 'Continue to Interview'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
