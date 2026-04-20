'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogoMark } from '@/components/Logo'

export default function CompletePage() {
  const { token } = useParams<{ token: string }>()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [assessmentId, setAssessmentId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email)
    })
  }, [])

  useEffect(() => {
    const id = sessionStorage.getItem(`assessment_${token}`)
    if (!id) return
    setAssessmentId(id)

    // Poll for report (generation takes a few seconds)
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/assess/${token}/report?assessment_id=${id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.content) {
            setReport(data.content)
            setLoading(false)
            clearInterval(interval)
          }
        }
      } catch {}
    }, 3000)

    // Timeout after 60 seconds
    setTimeout(() => {
      clearInterval(interval)
      setLoading(false)
    }, 60000)

    return () => clearInterval(interval)
  }, [token])

  return (
    <div className="min-h-screen bg-earth-50">
      <nav className="border-b border-earth-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center">
          <LogoMark size={24} dark />
          <span className="font-display text-basanite-900 text-sm ml-2">Basanite</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gold-500/10 mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c49a2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="font-display text-3xl text-basanite-900 mb-3">Assessment Complete</h1>
          <p className="text-basanite-500 text-sm leading-relaxed max-w-md mx-auto">
            Thank you. Your responses have been recorded and your feedback report is being generated
            {email ? <>, we'll email it to <span className="text-basanite-700 font-medium">{email}</span> as soon as it's ready.</> : '.'}
          </p>
        </div>

        {loading ? (
          <div className="bg-white border border-earth-200 p-10 text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-earth-200 rounded w-3/4 mx-auto mb-3" />
              <div className="h-4 bg-earth-200 rounded w-1/2 mx-auto mb-3" />
              <div className="h-4 bg-earth-200 rounded w-2/3 mx-auto" />
            </div>
            <p className="text-xs text-basanite-400 mt-6">Generating your feedback report...</p>
          </div>
        ) : report ? (
          <div className="space-y-6">
            {/* Download */}
            <div className="flex justify-end">
              <a
                href={assessmentId ? `/api/assess/${token}/report/candidate/pdf?assessment_id=${assessmentId}` : '#'}
                aria-disabled={!assessmentId}
                className={`inline-flex items-center gap-2 bg-basanite-900 text-white text-xs font-medium px-4 py-2 transition-colors ${assessmentId ? 'hover:bg-gold-600' : 'opacity-50 pointer-events-none'}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download PDF
              </a>
            </div>

            {/* Summary */}
            {report.summary && (
              <div className="bg-white border border-earth-200 p-6">
                <h2 className="font-display text-lg text-basanite-900 mb-3">Your Performance Summary</h2>
                <p className="text-sm text-basanite-700 leading-relaxed">{report.summary}</p>
              </div>
            )}

            {/* Strengths */}
            {report.strengths?.length > 0 && (
              <div className="bg-white border border-earth-200 p-6">
                <h2 className="font-display text-lg text-basanite-900 mb-3">What You Did Well</h2>
                <ul className="space-y-2">
                  {report.strengths.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-basanite-700">
                      <span className="text-gold-500 mt-0.5">&#9670;</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas for Development */}
            {report.areas_for_development?.length > 0 && (
              <div className="bg-white border border-earth-200 p-6">
                <h2 className="font-display text-lg text-basanite-900 mb-3">Areas for Development</h2>
                <ul className="space-y-2">
                  {report.areas_for_development.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-basanite-700">
                      <span className="text-basanite-300 mt-0.5">&#9670;</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Overall */}
            {report.overall_impression && (
              <div className="bg-white border border-gold-500/20 p-6">
                <p className="text-sm text-basanite-700 leading-relaxed italic">{report.overall_impression}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-earth-200 p-8 text-center">
            <p className="text-basanite-500 text-sm">
              Your report is still being generated.
              {email ? <> It will be emailed to <span className="text-basanite-700 font-medium">{email}</span> shortly, you can close this page.</> : ' Check back in a moment, or keep an eye on your inbox.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
