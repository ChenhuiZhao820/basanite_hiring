'use client'

// Pre-interview consent screen. The candidate must explicitly consent to:
//   - being at least 16 years old
//   - their voice being recorded and processed
//   - the interview being conducted and scored by AI
//   - their CV being processed (extracted + used to ground the interview)
// They can also OPTIONALLY register a GDPR Article 22 objection — which
// flags the assessment so the hirer must apply human review before acting
// on the score in any consequential decision.
//
// Consents are stashed in sessionStorage and persisted server-side once
// the assessment is created in /onboard's start step.

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { LogoMark } from '@/components/Logo'
import { LegalFooter } from '@/components/LegalFooter'

type ConsentState = {
  over_16: boolean
  recording: boolean
  ai_scoring: boolean
  cv_processing: boolean
  privacy_notice: boolean
  object_to_automated_decisions: boolean
}

const REQUIRED: Array<keyof ConsentState> = ['over_16', 'recording', 'ai_scoring', 'cv_processing', 'privacy_notice']

export default function ConsentPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [c, setC] = useState<ConsentState>({
    over_16: false,
    recording: false,
    ai_scoring: false,
    cv_processing: false,
    privacy_notice: false,
    object_to_automated_decisions: false,
  })

  useEffect(() => {
    // Restore prior choices if the user came back to this screen.
    try {
      const raw = sessionStorage.getItem(`consent_${token}`)
      if (raw) setC(JSON.parse(raw))
    } catch {}
  }, [token])

  const allRequired = REQUIRED.every(k => c[k])

  function update<K extends keyof ConsentState>(key: K, value: ConsentState[K]) {
    setC(prev => {
      const next = { ...prev, [key]: value }
      try { sessionStorage.setItem(`consent_${token}`, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function continueOn() {
    if (!allRequired) return
    router.push(`/assess/${token}/onboard`)
  }

  return (
    <div className="min-h-screen bg-earth-50 dark:bg-basanite-950 flex flex-col">
      <nav className="border-b border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-900">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center">
          <LogoMark size={24} dark />
          <span className="font-display text-basanite-900 dark:text-earth-100 text-sm ml-2">Basanite</span>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-2xl w-full">
          <div className="bg-white dark:bg-basanite-900 border border-earth-200 dark:border-basanite-700 p-8 sm:p-10">
            <h1 className="font-display text-2xl text-basanite-900 dark:text-earth-100 mb-2">
              Before we start
            </h1>
            <p className="text-sm text-basanite-600 dark:text-earth-200/80 mb-6">
              We need to be transparent about what happens with your data. Please read each item carefully.
            </p>

            <div className="space-y-5">
              <Consent
                checked={c.over_16}
                onChange={v => update('over_16', v)}
                title="I am at least 16 years old."
                detail="Basanite is for adults. If you are under 16, please don't proceed."
              />

              <Consent
                checked={c.recording}
                onChange={v => update('recording', v)}
                title="I consent to my voice being recorded during the interview."
                detail="The recording is used to generate the transcript and score. It is stored encrypted and automatically deleted after 6 months."
              />

              <Consent
                checked={c.ai_scoring}
                onChange={v => update('ai_scoring', v)}
                title="I understand the interview is conducted and scored by AI."
                detail="An AI agent (powered by Anthropic Claude and ElevenLabs) conducts the interview. AI also produces the dimension scores and report. The hirer reviews the report before any decision."
              />

              <Consent
                checked={c.cv_processing}
                onChange={v => update('cv_processing', v)}
                title="I consent to my CV being processed to ground the interview."
                detail="Your CV is extracted into structured fields (roles, skills, experience) and used to tailor the interview questions. Processed by Anthropic. Deleted after 12 months."
              />

              <Consent
                checked={c.privacy_notice}
                onChange={v => update('privacy_notice', v)}
                title={
                  <>
                    I have read and understand the{' '}
                    <Link href="/privacy" target="_blank" className="text-gold-600 underline">Privacy Notice</Link>.
                  </>
                }
                detail="Where your data goes, how long it stays, your rights, and how to contact us."
              />
            </div>

            <div className="mt-8 pt-6 border-t border-earth-200 dark:border-basanite-700">
              <h2 className="text-sm font-medium text-basanite-800 dark:text-earth-100 mb-2">
                Optional — your right to human review
              </h2>
              <p className="text-xs text-basanite-500 dark:text-earth-200/60 mb-3">
                Under UK GDPR Article 22 you have the right not to be subject to a decision based solely on automated processing. Tick this if you want a human reviewer to look at your assessment before the hirer relies on it.
              </p>
              <Consent
                checked={c.object_to_automated_decisions}
                onChange={v => update('object_to_automated_decisions', v)}
                title="I object to fully automated decisions and request human review."
                detail="Your assessment will be flagged so the hirer must review it manually before acting on the score. This may delay your result by 1-3 working days."
              />
            </div>

            <button
              onClick={continueOn}
              disabled={!allRequired}
              className="block w-full text-center mt-8 px-6 py-3.5 bg-basanite-900 dark:bg-gold-500 text-white dark:text-basanite-950 text-sm font-medium hover:bg-gold-600 dark:hover:bg-gold-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {allRequired ? 'Continue' : 'Tick the required items above to continue'}
            </button>

            <p className="text-xs text-basanite-400 dark:text-earth-200/40 text-center mt-4">
              You can withdraw consent and erase your data at any time at{' '}
              <Link href="/data-rights" target="_blank" className="text-gold-600 underline">basanite.co.uk/data-rights</Link>.
            </p>
          </div>

          <LegalFooter dark className="mt-6" />
        </div>
      </div>
    </div>
  )
}

function Consent({
  checked,
  onChange,
  title,
  detail,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  title: React.ReactNode
  detail: string
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-1 w-4 h-4 accent-gold-600 cursor-pointer"
      />
      <div className="flex-1">
        <p className="text-sm text-basanite-900 dark:text-earth-100 font-medium leading-snug">{title}</p>
        <p className="text-xs text-basanite-500 dark:text-earth-200/60 mt-1 leading-relaxed">{detail}</p>
      </div>
    </label>
  )
}
