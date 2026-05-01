'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { useTheme } from '@/lib/theme'

type Section = 'profile' | 'password' | 'danger'

function useUser() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email ?? '')
        setName(user.user_metadata?.full_name ?? '')
      }
    })
  }, [])
  return { email, name }
}

function SectionCard({ title, description, children }: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-basanite-900 border border-slate-200 dark:border-basanite-800 p-6">
      <div className="mb-5">
        <h2 className="font-semibold text-[#0b1f3d] text-sm">{title}</h2>
        {description && <p className="text-xs text-slate-400 dark:text-earth-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-600 dark:text-earth-300">{label}</label>
      {children}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full border border-slate-200 dark:border-basanite-800 bg-white dark:bg-basanite-900 px-3 py-2 text-sm text-[#0b1f3d] placeholder-slate-400 focus:outline-none focus:border-[#1d4ed8] transition-colors ${props.className ?? ''}`}
    />
  )
}

function SaveButton({ loading, label = 'Save changes' }: { loading: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="bg-[#0b1f3d] hover:bg-[#1d4ed8] dark:bg-[#1d4ed8] dark:hover:bg-[#3b82f6] active:scale-95 text-white text-xs font-semibold px-5 py-2.5 transition-all duration-150 disabled:opacity-50"
    >
      {loading ? 'Saving…' : label}
    </button>
  )
}

function Feedback({ state }: { state: { ok: boolean; msg: string } | null }) {
  if (!state) return null
  return (
    <p className={`text-xs mt-3 ${state.ok ? 'text-green-600' : 'text-red-600'}`}>
      {state.msg}
    </p>
  )
}

// ─── Profile section ──────────────────────────────────────────────────────────

function ProfileSection({ initialEmail, initialName }: { initialEmail: string; initialName: string }) {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [currentPassword, setCurrentPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  // Populate once user loads
  useEffect(() => { setName(initialName); setEmail(initialEmail) }, [initialName, initialEmail])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setFeedback(null)

    const updates: Promise<Response>[] = []
    if (name !== initialName) {
      updates.push(fetch('/api/account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'profile', name }) }))
    }
    if (email !== initialEmail) {
      if (!currentPassword) { setFeedback({ ok: false, msg: 'Enter your current password to change your email.' }); setLoading(false); return }
      updates.push(fetch('/api/account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'email', email, currentPassword }) }))
    }

    if (!updates.length) { setLoading(false); return }

    let results: Response[]
    try { results = await Promise.all(updates) }
    catch { setFeedback({ ok: false, msg: 'Network error. Please try again.' }); setLoading(false); return }
    const bodies = await Promise.all(results.map(r => r.json().catch(() => ({ error: r.ok ? 'Unexpected response' : `Error ${r.status}` }))))
    const errors = bodies.filter(b => b.error).map(b => b.error)

    if (errors.length) {
      setFeedback({ ok: false, msg: errors[0] })
    } else {
      const msg = bodies.find(b => b.message)?.message ?? 'Changes saved.'
      setFeedback({ ok: true, msg })
    }
    setLoading(false)
  }

  return (
    <SectionCard title="Profile" description="Your name and email address.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        </Field>
        <Field label="Email address">
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          {email !== initialEmail && (
            <p className="text-xs text-slate-400 dark:text-earth-500 mt-1">A verification link will be sent to the new address.</p>
          )}
        </Field>
        {email !== initialEmail && (
          <Field label="Current password">
            <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Required to confirm email change" />
          </Field>
        )}
        <div className="pt-1">
          <SaveButton loading={loading} />
          <Feedback state={feedback} />
        </div>
      </form>
    </SectionCard>
  )
}

// ─── Password section ─────────────────────────────────────────────────────────

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)
    if (newPassword !== confirm) { setFeedback({ ok: false, msg: 'Passwords do not match.' }); return }
    setLoading(true)
    let res: Response
    try { res = await fetch('/api/account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'password', currentPassword, newPassword }) }) }
    catch { setFeedback({ ok: false, msg: 'Network error. Please try again.' }); setLoading(false); return }
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok || data.error) { setFeedback({ ok: false, msg: data.error ?? 'Failed to update password.' }); return }
    setFeedback({ ok: true, msg: 'Password updated.' })
    setCurrentPassword(''); setNewPassword(''); setConfirm('')
  }

  return (
    <SectionCard title="Password" description="Change your login password.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Current password">
          <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Your current password" />
        </Field>
        <Field label="New password">
          <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" />
        </Field>
        <Field label="Confirm new password">
          <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" />
        </Field>
        <div className="pt-1">
          <SaveButton loading={loading} label="Update password" />
          <Feedback state={feedback} />
        </div>
      </form>
    </SectionCard>
  )
}

// ─── Danger zone ──────────────────────────────────────────────────────────────

function DangerZone() {
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    if (confirm !== 'delete my account') {
      setFeedback({ ok: false, msg: 'Type exactly: delete my account' }); return
    }
    setLoading(true)
    let res: Response
    try { res = await fetch('/api/account', { method: 'DELETE' }) }
    catch { setFeedback({ ok: false, msg: 'Network error. Please try again.' }); setLoading(false); return }
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.error) {
      setFeedback({ ok: false, msg: data.error ?? 'Failed to delete account.' }); setLoading(false); return
    }
    // Sign out and redirect
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login?deleted=1'
  }

  return (
    <SectionCard title="Danger zone">
      <p className="text-xs text-slate-500 dark:text-earth-400 mb-4">
        Permanently delete your account and all associated searches and candidates. This cannot be undone.
      </p>
      <form onSubmit={handleDelete} className="space-y-3">
        <Field label={`Type "delete my account" to confirm`}>
          <Input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="delete my account"
          />
        </Field>
        <button
          type="submit"
          disabled={loading || confirm !== 'delete my account'}
          className="bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-semibold px-5 py-2.5 transition-all duration-150 disabled:opacity-40"
        >
          {loading ? 'Deleting…' : 'Delete account'}
        </button>
        <Feedback state={feedback} />
      </form>
    </SectionCard>
  )
}

// ─── Appearance ───────────────────────────────────────────────────────────────

function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  return (
    <SectionCard title="Appearance" description="Choose how the dashboard looks. Saved per-browser.">
      <div className="grid grid-cols-2 gap-2">
        {(['light', 'dark'] as const).map(opt => {
          const active = theme === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setTheme(opt)}
              className={
                'flex items-center justify-center gap-2 border px-3 py-3 text-xs font-medium transition-colors ' +
                (active
                  ? 'border-[#0b1f3d] bg-[#0b1f3d] text-white'
                  : 'border-slate-200 dark:border-basanite-800 text-slate-600 dark:text-earth-300 hover:border-slate-300 hover:text-[#0b1f3d]')
              }
            >
              {opt === 'light' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
              {opt === 'light' ? 'Light' : 'Dark'}
            </button>
          )
        })}
      </div>
    </SectionCard>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  useDocumentTitle('Account')
  const { email, name } = useUser()

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-earth-500 hover:text-[#0b1f3d] transition-colors mb-4"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to dashboard
        </Link>
        <h1 className="font-display text-2xl font-bold text-[#0b1f3d]">Account</h1>
        <p className="text-slate-500 dark:text-earth-400 text-sm mt-1">Manage your profile and account settings.</p>
      </div>

      <div className="space-y-4">
        <ProfileSection initialEmail={email} initialName={name} />
        <AppearanceSection />
        <PasswordSection />
        <DangerZone />
      </div>
    </div>
  )
}
