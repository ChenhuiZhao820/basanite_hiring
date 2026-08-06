'use client'

import { useState } from 'react'
import { LogoMark } from '@/components/Logo'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordPage() {
  useDocumentTitle('Reset password')

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!EMAIL_RE.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    setLoading(true)
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
      // Network error — fall through to the same generic message below.
      // Never surface upstream error details: the API always returns
      // { ok: true } by design so callers can't tell whether the account
      // exists, and a distinct error state here would defeat that.
    }
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-earth-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <a href="/" className="flex items-center gap-2 justify-center mb-10">
          <LogoMark size={28} dark />
          <span className="font-semibold text-[#1a1a18] text-base">Basanite</span>
        </a>

        <div className="bg-white border border-slate-200 p-8">
          <h1 className="font-display text-2xl font-bold text-basanite-900 mb-1">Reset password</h1>

          {sent ? (
            <p className="text-slate-500 text-sm mb-1">
              If an account exists for that email, we&apos;ve sent a password reset link. Check your inbox.
            </p>
          ) : (
            <>
              <p className="text-slate-500 text-sm mb-7">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
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

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-basanite-900 hover:bg-gold-600 text-white font-medium py-2.5 text-sm transition-colors duration-150 disabled:opacity-60"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center mt-5">
          <a href="/login" className="text-gold-600 hover:underline">
            Back to sign in
          </a>
        </p>
      </div>
    </div>
  )
}
