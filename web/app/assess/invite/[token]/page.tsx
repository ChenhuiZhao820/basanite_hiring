'use client'

// ATS-invited candidate landing page.
//
// The invite link `/assess/invite/{token}` is unique per candidate. We:
//   1. Resolve the invite to its assessment via /api/assess/invite/{token}.
//   2. Stash the assessment_id under the same sessionStorage key the
//      self-serve flow uses, so /interview keeps working unchanged.
//   3. Show the candidate a brief greeting + duration estimate.
//   4. Send them to the mic/camera check, then the interview.
//
// We deliberately skip the CV upload step — the CV came in via the ATS
// attachment when the application was synced (see core/ats.fetch_candidate_cv_text).

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  const [invite, setInvite] = useState<Invite | null>(null)
  const [error, setError] = useState('')

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
        if (cancelled) return
        // Hand off to the existing interview flow which keys on the role
        // token in sessionStorage. This means a candidate who arrives via
        // an invite is otherwise indistinguishable from a self-serve one
        // from the /interview page's point of view.
        sessionStorage.setItem(`assessment_${data.role_token}`, data.assessment_id)
        setInvite(data)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load invite.'
        if (!cancelled) setError(msg)
      }
    })()
    return () => { cancelled = true }
  }, [token])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-earth-50 p-6">
        <div className="max-w-md w-full bg-white border border-earth-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <LogoMark size={22} dark />
            <span className="font-display text-basanite-900 text-sm">Basanite</span>
          </div>
          <h1 className="font-display text-lg text-basanite-900 mb-2">Invite unavailable</h1>
          <p className="text-sm text-slate-600">{error}</p>
          <p className="text-xs text-slate-400 mt-4">
            If you think this is a mistake, reach out to the team that invited you and ask
            them to resend the link.
          </p>
        </div>
      </div>
    )
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-earth-50">
        <div className="text-sm text-slate-500">Loading your invite…</div>
      </div>
    )
  }

  // ENG-30: greeting is generic — the invite endpoint no longer returns
  // candidate_name to anyone holding the URL. The candidate's real name
  // is shown after sign-in, when ownership is verified.
  const greeting = 'Hi,'
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

        <h1 className="font-display text-2xl text-basanite-900 mb-2">{greeting}</h1>
        <p className="text-base text-slate-700 mb-6">
          You&apos;ve been invited to interview for <strong>{where}</strong>.
          Your application and CV came directly from their hiring system, so we already have
          everything we need to start.
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

        <p className="text-sm text-slate-600 mb-2">Before we start, a quick check:</p>
        <ul className="text-sm text-slate-600 list-disc pl-5 mb-6 space-y-1">
          <li>Quiet space, no background noise</li>
          <li>Working microphone (we&apos;ll test it next)</li>
          <li>Stable internet connection</li>
          <li>About {invite.interview_duration_minutes} uninterrupted minutes</li>
        </ul>

        <button
          onClick={() => router.push(`/assess/${invite.role_token}/check`)}
          className="bg-basanite-900 hover:bg-gold-600 text-white font-medium px-6 py-3 transition-colors"
        >
          Continue to device check
        </button>

        <p className="text-xs text-slate-400 mt-6">
          This invite link is unique to you — please don&apos;t share it.
        </p>
      </div>
    </div>
  )
}
