'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogoMark } from '@/components/Logo'
import { safeNext } from '@/lib/validate'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { REGISTER_INTEREST_URL } from '@/lib/links'

function LoginForm() {
  useDocumentTitle('Sign in')
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNext(searchParams.get('next'))
  const verified = searchParams.get('verified') === '1'
  const urlError = searchParams.get('error')
  const deleted = searchParams.get('deleted') === '1'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push(next)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-earth-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <a href="/" className="flex items-center gap-2 justify-center mb-10">
          <LogoMark size={28} dark />
          <span className="font-semibold text-[#1a1a18] text-base">Basanite</span>
        </a>

        {verified && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-3 mb-4">
            Account confirmed, you can now sign in.
          </div>
        )}

        {deleted && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-3 mb-4">
            Account successfully deleted.
          </div>
        )}

        {urlError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 mb-4">
            {urlError}
          </div>
        )}

        <div className="bg-white border border-slate-200 p-8">
          <h1 className="font-display text-2xl font-bold text-basanite-900 mb-1">Sign in</h1>
          <p className="text-slate-500 text-sm mb-7">Access your assessment dashboard.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full border border-slate-300 px-3 py-2.5 text-sm text-basanite-900 outline-none focus:border-gold-500 transition-colors"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Password
                </label>
                <a href="/forgot-password" className="text-xs text-gold-600 hover:underline">
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full border border-slate-300 px-3 py-2.5 text-sm text-basanite-900 outline-none focus:border-gold-500 transition-colors"
                placeholder="••••••••"
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
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-xs text-slate-400 text-center mt-5">
          Don&apos;t have access?{' '}
          <a
            href={REGISTER_INTEREST_URL}
            className="text-gold-600 hover:underline"
          >
            Register interest
          </a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
