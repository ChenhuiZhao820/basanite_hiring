'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  roleId: string
}

// Ad-hoc candidate entry for a Copilot interview. Email is required: it is
// how the assessment reaches the candidate portal and how the candidate
// report is delivered — the loop that answers the surveillance objection.
export function AdHocCandidateForm({ roleId }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cvText, setCvText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/copilot/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_id: roleId,
          candidate_name: name.trim(),
          candidate_email: email.trim(),
          cv_text: cvText.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Failed to create session')
      router.push(`/dashboard/roles/${roleId}/copilot/${data.session_id}/brief`)
    } catch (err: any) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl">
      <div className="mb-5">
        <label htmlFor="copilot-name" className="block text-xs text-basanite-600 dark:text-earth-300 font-medium uppercase tracking-wide mb-2">
          Candidate name
        </label>
        <input
          id="copilot-name"
          type="text"
          required
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 px-3 py-2.5 text-sm text-basanite-900 dark:text-earth-100 focus:outline-none focus:border-gold-500"
          placeholder="e.g. Amara Osei"
        />
      </div>

      <div className="mb-5">
        <label htmlFor="copilot-email" className="block text-xs text-basanite-600 dark:text-earth-300 font-medium uppercase tracking-wide mb-2">
          Candidate email
        </label>
        <input
          id="copilot-email"
          type="email"
          required
          maxLength={320}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 px-3 py-2.5 text-sm text-basanite-900 dark:text-earth-100 focus:outline-none focus:border-gold-500"
          placeholder="candidate@example.com"
        />
        <p className="text-xs text-basanite-400 dark:text-earth-500 mt-1.5">
          Used to deliver the candidate&apos;s feedback report after the interview.
        </p>
      </div>

      <div className="mb-6">
        <label htmlFor="copilot-cv" className="block text-xs text-basanite-600 dark:text-earth-300 font-medium uppercase tracking-wide mb-2">
          CV text <span className="normal-case font-normal text-basanite-400 dark:text-earth-500">(optional — paste the plain text)</span>
        </label>
        <textarea
          id="copilot-cv"
          rows={8}
          maxLength={60000}
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          className="w-full border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 px-3 py-2.5 text-sm text-basanite-900 dark:text-earth-100 focus:outline-none focus:border-gold-500 font-mono"
          placeholder="Paste the candidate's CV here to get CV-anchored question angles in your brief…"
        />
      </div>

      {error && <p className="text-xs text-red-600 mb-4">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white text-xs font-medium px-5 py-2.5 transition-colors disabled:opacity-60"
      >
        {busy ? 'Creating session…' : 'Create session & prepare brief'}
      </button>
    </form>
  )
}
