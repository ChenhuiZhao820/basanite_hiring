'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogoMark } from '@/components/Logo'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

export default function SetPasswordPage() {
  useDocumentTitle('Set password')
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return
      if (!user) {
        router.replace('/login?error=' + encodeURIComponent('Your link has expired. Please request a new one.'))
        return
      }
      setAuthReady(true)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Use at least 8 characters.'); return }
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) { setError(updateError.message); setLoading(false); return }
    // Candidates (invited via the waitlist with persona=candidate) go to
    // their applications portal; the org post-signup hook is hirer-only.
    const { data: { user } } = await supabase.auth.getUser()
    const isCandidate = user?.app_metadata?.is_candidate === true
    if (!isCandidate) {
      // Best-effort: hit the post-signup hook so a hirer landing here is
      // auto-joined to a matching domain org (if configured) or has their
      // personal-org context seeded as active. Never blocks the redirect.
      try { await fetch('/api/auth/post-signup', { method: 'POST' }) } catch {}
    }
    router.push(isCandidate ? '/portal' : '/dashboard')
    router.refresh()
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-earth-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-basanite-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-basanite-500">Checking your link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-earth-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <a href="/" className="flex items-center gap-2 justify-center mb-10">
          <LogoMark size={28} dark />
          <span className="font-semibold text-[#1a1a18] text-base">Basanite</span>
        </a>
        <div className="bg-white border border-slate-200 p-8">
          <h1 className="font-display text-2xl font-bold text-basanite-900 mb-1">Set your password</h1>
          <p className="text-slate-500 text-sm mb-7">Welcome. Pick a password to finish setting up your account.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full border border-slate-300 px-3 py-2.5 text-sm text-basanite-900 outline-none focus:border-gold-500 transition-colors"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full border border-slate-300 px-3 py-2.5 text-sm text-basanite-900 outline-none focus:border-gold-500 transition-colors"
                placeholder="Repeat it"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-basanite-900 hover:bg-gold-600 text-white font-medium py-2.5 text-sm transition-colors duration-150 disabled:opacity-60"
            >
              {loading ? 'Saving...' : 'Save password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
