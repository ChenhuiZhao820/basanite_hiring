'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { VoicePicker } from '@/components/VoicePicker'

// Target length is a hint for the AI, it decides when to end based on signal.
const DEFAULT_TARGET_MINUTES = 20
const MIN_MINUTES = 5
const MAX_MINUTES = 60

const ALL_DIMENSIONS = [
  { key: 'judgment_under_ambiguity', name: 'Judgment Under Ambiguity', description: 'The capacity to act decisively on incomplete information.' },
  { key: 'tacit_knowledge', name: 'Tacit Knowledge Extraction', description: 'Surfacing knowledge that lives in experience, not text.' },
  { key: 'intuition_under_scarcity', name: 'Intuition Under Data Scarcity', description: 'Sound judgment when data is insufficient.' },
  { key: 'psychological_safety', name: 'Psychological Safety & Collective Learning', description: 'Creating conditions where teams correct errors.' },
  { key: 'creative_reframing', name: 'Creative Problem Reframing', description: 'Recognising when the team is solving the wrong problem.' },
  { key: 'ethical_reasoning', name: 'Ethical Reasoning', description: 'Navigating real tradeoffs with integrity.' },
  { key: 'capacity_for_change', name: 'Capacity to Be Changed by Experience', description: 'Learning from experience, not just accumulating it.' },
  { key: 'technical_depth', name: 'Technical Judgment Depth', description: 'Understanding boundaries of technical decisions.' },
]

export default function NewRolePage() {
  useDocumentTitle('New role')
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [title, setTitle] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [dimensions, setDimensions] = useState<string[]>([])
  const [technicalDepth, setTechnicalDepth] = useState<'application' | 'research_architecture'>('application')
  // Backed by a raw string so the user can type freely (e.g. clear the
  // field, then type "1" then "0" to reach 10). Clamping happens on blur,
  // not on every keystroke — the old onChange clamp made "10" impossible to
  // type because a lone "1" was instantly corrected up to the 5-min minimum.
  const [durationInput, setDurationInput] = useState(String(DEFAULT_TARGET_MINUTES))
  const interviewDurationMinutes = parseInt(durationInput, 10)
  const durationTooShort = Number.isFinite(interviewDurationMinutes) && interviewDurationMinutes < MIN_MINUTES
  const [customInstructions, setCustomInstructions] = useState('')
  const [voiceId, setVoiceId] = useState<string | null>(null)
  const [recommendLoading, setRecommendLoading] = useState(false)
  const [roleId, setRoleId] = useState<string | null>(null)

  const toggleDimension = (key: string) => {
    setDimensions(prev =>
      prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
    )
  }

  // Step 1: Create role and get dimension recommendations
  async function handleJDSubmit() {
    if (!title.trim() || !jobDescription.trim()) {
      setError('Please provide a title and job description.')
      return
    }
    setError('')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create role via API
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, company_name: companyName, job_description: jobDescription }),
      })
      if (!res.ok) throw new Error('Failed to create role')
      const role = await res.json()
      setRoleId(role.id)

      // Get dimension recommendations
      setRecommendLoading(true)
      const recRes = await fetch(`/api/roles/${role.id}/recommend-dimensions`, { method: 'POST' })
      if (recRes.ok) {
        const rec = await recRes.json()
        if (rec.dimensions) {
          setDimensions(rec.dimensions)
        }
        if (rec.technical_depth) {
          setTechnicalDepth(rec.technical_depth)
        }
      }
      setRecommendLoading(false)
      setStep(1)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Save dimensions and go live
  async function handleGoLive() {
    if (dimensions.length < 2) {
      setError('Please select at least 2 dimensions.')
      return
    }
    if (!Number.isFinite(interviewDurationMinutes) || interviewDurationMinutes < 1 || interviewDurationMinutes > MAX_MINUTES) {
      setError(`Target length must be a number between 1 and ${MAX_MINUTES} minutes.`)
      return
    }
    if (!roleId) return
    setError('')
    setLoading(true)

    try {
      // Update role with dimensions + interview config
      await fetch(`/api/roles/${roleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimensions,
          technical_depth: technicalDepth,
          interview_duration_minutes: interviewDurationMinutes,
          custom_instructions: customInstructions.trim() || null,
          interviewer_voice_id: voiceId,
          status: 'live',
        }),
      })

      // Generate prompt
      await fetch(`/api/roles/${roleId}/generate-prompt`, { method: 'POST' })

      router.push(`/dashboard/roles/${roleId}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const steps = ['Job Description', 'Evaluation Dimensions']

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/dashboard" className="text-xs text-basanite-400 dark:text-earth-500 hover:text-basanite-600 dark:hover:text-earth-300 transition-colors mb-4 inline-block">
        &larr; Back to dashboard
      </Link>
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
              i <= step ? 'bg-basanite-900 dark:bg-gold-600 text-white' : 'bg-earth-200 dark:bg-basanite-700 text-basanite-500 dark:text-earth-400'
            }`}>
              {i + 1}
            </div>
            <span className={`text-sm ${i <= step ? 'text-basanite-900 dark:text-earth-100 font-medium' : 'text-basanite-400 dark:text-earth-500'}`}>
              {s}
            </span>
            {i < steps.length - 1 && <div className="w-12 h-px bg-earth-300 dark:bg-basanite-700" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 mb-6">{error}</div>
      )}

      {/* Step 1: Job Description */}
      {step === 0 && (
        <div>
          <h1 className="font-display text-2xl text-basanite-900 dark:text-earth-100 mb-2">Create a new role</h1>
          <p className="text-basanite-500 dark:text-earth-400 text-sm mb-8">
            Paste the job description as-is. Basanite will analyse it and recommend evaluation dimensions.
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-basanite-600 dark:text-earth-300 mb-1.5 uppercase tracking-wide">Role Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 placeholder-basanite-400 dark:placeholder-earth-500 px-4 py-3 text-sm text-basanite-900 dark:text-earth-100 outline-none focus:border-gold-500 transition-colors"
                placeholder="Senior Backend Engineer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-basanite-600 dark:text-earth-300 mb-1.5 uppercase tracking-wide">Company Name (optional)</label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 placeholder-basanite-400 dark:placeholder-earth-500 px-4 py-3 text-sm text-basanite-900 dark:text-earth-100 outline-none focus:border-gold-500 transition-colors"
                placeholder="Acme Corp"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-basanite-600 dark:text-earth-300 mb-1.5 uppercase tracking-wide">Job Description</label>
              <textarea
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                rows={12}
                className="w-full border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 placeholder-basanite-400 dark:placeholder-earth-500 px-4 py-3 text-sm text-basanite-900 dark:text-earth-100 outline-none focus:border-gold-500 transition-colors resize-y"
                placeholder="Paste the full job description here..."
              />
            </div>

            <button
              onClick={handleJDSubmit}
              disabled={loading}
              className="w-full bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white font-medium py-3 text-sm transition-colors disabled:opacity-60"
            >
              {loading ? 'Analysing...' : 'Analyse & Recommend Dimensions'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Dimension Selection */}
      {step === 1 && (
        <div>
          <h1 className="font-display text-2xl text-basanite-900 dark:text-earth-100 mb-2">Configure evaluation dimensions</h1>
          <p className="text-basanite-500 dark:text-earth-400 text-sm mb-8">
            {recommendLoading
              ? 'Analysing your job description...'
              : 'We recommend the highlighted dimensions for this role. Toggle to adjust.'}
          </p>

          {/* Technical depth toggle */}
          <div className="mb-8">
            <label className="block text-xs font-medium text-basanite-600 dark:text-earth-300 mb-3 uppercase tracking-wide">Technical Depth</label>
            <div className="flex gap-3">
              <button
                onClick={() => setTechnicalDepth('application')}
                className={`flex-1 px-4 py-3 text-sm border transition-colors ${
                  technicalDepth === 'application'
                    ? 'border-gold-500 bg-gold-500/10 text-basanite-900 dark:text-earth-100'
                    : 'border-earth-300 dark:border-basanite-700 text-basanite-500 dark:text-earth-400 hover:border-earth-300 dark:hover:border-basanite-700'
                }`}
              >
                <span className="font-medium block mb-0.5">Application-oriented</span>
                <span className="text-xs opacity-70">Frontend, backend, data analyst, DevOps</span>
              </button>
              <button
                onClick={() => setTechnicalDepth('research_architecture')}
                className={`flex-1 px-4 py-3 text-sm border transition-colors ${
                  technicalDepth === 'research_architecture'
                    ? 'border-gold-500 bg-gold-500/10 text-basanite-900 dark:text-earth-100'
                    : 'border-earth-300 dark:border-basanite-700 text-basanite-500 dark:text-earth-400 hover:border-earth-300 dark:hover:border-basanite-700'
                }`}
              >
                <span className="font-medium block mb-0.5">Research / Architecture</span>
                <span className="text-xs opacity-70">ML researcher, systems architect, platform engineer</span>
              </button>
            </div>
          </div>

          {/* Target length */}
          <div className="mb-8">
            <label className="block text-xs font-medium text-basanite-600 dark:text-earth-300 mb-1.5 uppercase tracking-wide">
              Target length
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={MAX_MINUTES}
                step={1}
                value={durationInput}
                onChange={e => setDurationInput(e.target.value)}
                onBlur={() => {
                  const n = parseInt(durationInput, 10)
                  if (!Number.isFinite(n)) {
                    setDurationInput(String(DEFAULT_TARGET_MINUTES))
                    return
                  }
                  // Clamp to a sane range on blur only; short-but-valid values
                  // are kept and surfaced with a warning rather than corrected.
                  setDurationInput(String(Math.max(1, Math.min(MAX_MINUTES, n))))
                }}
                className="w-24 border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 placeholder-basanite-400 dark:placeholder-earth-500 px-3 py-2.5 text-sm text-basanite-900 dark:text-earth-100 outline-none focus:border-gold-500 transition-colors"
              />
              <span className="text-sm text-basanite-500 dark:text-earth-400">minutes</span>
            </div>
            <p className="text-xs text-basanite-400 dark:text-earth-500 mt-2">
              Just a target, the AI ends the interview when it has enough signal. Typical 15 to 25 min; can extend to {MAX_MINUTES} for complex candidates.
            </p>
            {durationTooShort && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Interviews shorter than {MIN_MINUTES} minutes rarely gather enough signal to score reliably. We recommend at least {MIN_MINUTES}.
              </p>
            )}
          </div>

          {/* Custom instructions */}
          <div className="mb-8">
            <label className="block text-xs font-medium text-basanite-600 dark:text-earth-300 mb-1.5 uppercase tracking-wide">
              Extra interview instructions <span className="text-basanite-400 dark:text-earth-500 normal-case">(optional)</span>
            </label>
            <p className="text-xs text-basanite-400 dark:text-earth-500 mb-2">
              Anything specific you want the interviewer to ask, e.g. "Ask about salary expectations and notice period."
            </p>
            <textarea
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              rows={4}
              className="w-full border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 placeholder-basanite-400 dark:placeholder-earth-500 px-4 py-3 text-sm text-basanite-900 dark:text-earth-100 outline-none focus:border-gold-500 transition-colors resize-y"
              placeholder="Ask about their salary expectations and availability. Confirm they understand what our company does."
            />
          </div>

          {/* Interviewer voice */}
          <div className="mb-8">
            <label className="block text-xs font-medium text-basanite-600 dark:text-earth-300 mb-1.5 uppercase tracking-wide">
              Interviewer voice <span className="text-basanite-400 dark:text-earth-500 normal-case">(optional)</span>
            </label>
            <p className="text-xs text-basanite-400 dark:text-earth-500 mb-3">
              Pick the voice candidates will hear. Click play on any card to preview a 5-second sample.
            </p>
            <VoicePicker value={voiceId} onChange={setVoiceId} />
          </div>

          {/* Dimensions */}
          <div className="space-y-3 mb-8">
            {ALL_DIMENSIONS.map(d => (
              <button
                key={d.key}
                onClick={() => toggleDimension(d.key)}
                className={`w-full text-left px-5 py-4 border transition-all ${
                  dimensions.includes(d.key)
                    ? 'border-gold-500 bg-gold-500/5'
                    : 'border-earth-200 dark:border-basanite-700 hover:border-earth-300 dark:hover:border-basanite-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-basanite-900 dark:text-earth-100">{d.name}</span>
                  <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                    dimensions.includes(d.key) ? 'border-gold-500 bg-gold-500' : 'border-earth-300 dark:border-basanite-700'
                  }`}>
                    {dimensions.includes(d.key) && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <p className="text-xs text-basanite-500 dark:text-earth-400 mt-1">{d.description}</p>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="px-6 py-3 border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 placeholder-basanite-400 dark:placeholder-earth-500 text-basanite-600 dark:text-earth-300 text-sm font-medium hover:bg-earth-100 dark:hover:bg-basanite-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleGoLive}
              disabled={loading || dimensions.length < 2}
              className="flex-1 bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white font-medium py-3 text-sm transition-colors disabled:opacity-60"
            >
              {loading ? 'Going live...' : `Go Live with ${dimensions.length} Dimensions`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
