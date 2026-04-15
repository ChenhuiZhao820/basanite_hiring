'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogoMark } from '@/components/Logo'

export default function OnboardPage() {
  const router = useRouter()
  const { token } = useParams<{ token: string }>()
  const supabase = createClient()

  const [step, setStep] = useState<'auth' | 'cv'>('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [cvText, setCvText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(true)

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name, is_candidate: true } },
        })
        if (error) throw error
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

  async function handleCVSubmit() {
    if (!cvText.trim()) {
      setError('Please paste your CV content.')
      return
    }
    setError('')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const res = await fetch(`/api/assess/${token}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_user_id: user.id,
          candidate_name: name || user.user_metadata?.full_name || email.split('@')[0],
          candidate_email: email || user.email,
          cv_text: cvText,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start assessment')
      }

      const data = await res.json()
      // Store assessment_id for interview page
      sessionStorage.setItem(`assessment_${token}`, data.assessment_id)
      router.push(`/assess/${token}/interview`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-earth-50 flex flex-col">
      <nav className="border-b border-earth-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center">
          <LogoMark size={24} dark />
          <span className="font-display text-basanite-900 text-sm ml-2">Basanite</span>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-lg w-full">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 mb-6">{error}</div>
          )}

          {step === 'auth' && (
            <div className="bg-white border border-earth-200 p-8">
              <h1 className="font-display text-2xl text-basanite-900 mb-2">
                {isSignUp ? 'Create your account' : 'Sign in'}
              </h1>
              <p className="text-basanite-500 text-sm mb-6">
                {isSignUp ? 'To begin the assessment, create a Basanite account.' : 'Sign in to continue your assessment.'}
              </p>

              <form onSubmit={handleAuth} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="block text-xs font-medium text-basanite-600 mb-1.5 uppercase tracking-wide">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required={isSignUp}
                      className="w-full border border-earth-300 px-4 py-2.5 text-sm text-basanite-900 outline-none focus:border-gold-500 transition-colors"
                      placeholder="Jane Smith"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-basanite-600 mb-1.5 uppercase tracking-wide">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full border border-earth-300 px-4 py-2.5 text-sm text-basanite-900 outline-none focus:border-gold-500 transition-colors"
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-basanite-600 mb-1.5 uppercase tracking-wide">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full border border-earth-300 px-4 py-2.5 text-sm text-basanite-900 outline-none focus:border-gold-500 transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-basanite-900 hover:bg-gold-600 text-white font-medium py-2.5 text-sm transition-colors disabled:opacity-60"
                >
                  {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              <p className="text-xs text-basanite-400 text-center mt-4">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button onClick={() => setIsSignUp(!isSignUp)} className="text-gold-600 hover:underline">
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </p>
            </div>
          )}

          {step === 'cv' && (
            <div className="bg-white border border-earth-200 p-8">
              <h1 className="font-display text-2xl text-basanite-900 mb-2">Upload your CV</h1>
              <p className="text-basanite-500 text-sm mb-6">
                Paste the text content of your CV below. This helps us personalise the interview to your experience.
              </p>

              <textarea
                value={cvText}
                onChange={e => setCvText(e.target.value)}
                rows={14}
                className="w-full border border-earth-300 px-4 py-3 text-sm text-basanite-900 outline-none focus:border-gold-500 transition-colors resize-y mb-4"
                placeholder="Paste your CV content here..."
              />

              <button
                onClick={handleCVSubmit}
                disabled={loading || !cvText.trim()}
                className="w-full bg-basanite-900 hover:bg-gold-600 text-white font-medium py-3 text-sm transition-colors disabled:opacity-60"
              >
                {loading ? 'Processing your CV...' : 'Continue to Interview'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
