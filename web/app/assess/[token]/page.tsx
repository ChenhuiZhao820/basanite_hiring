import { LogoMark } from '@/components/Logo'
import Link from 'next/link'
import { LegalFooter } from '@/components/LegalFooter'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'

export const metadata = { title: 'Assessment' }

export default async function AssessmentLandingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Fetch role info (public endpoint)
  let roleInfo: {
    role_title?: string
    company_name?: string
    dimensions_count?: number
    interview_duration_minutes?: number
  } | null = null
  try {
    const res = await fetch(`${PIPELINE_URL}/assess/${token}`, { cache: 'no-store' })
    if (res.ok) roleInfo = await res.json()
  } catch {}

  if (!roleInfo) {
    return (
      <div className="min-h-screen bg-earth-50 dark:bg-basanite-950 flex items-center justify-center px-4">
        <div className="text-center">
          <LogoMark size={36} dark />
          <h1 className="font-display text-2xl text-basanite-900 dark:text-earth-100 mt-6 mb-3">Assessment Not Found</h1>
          <p className="text-basanite-500 dark:text-earth-200/60 text-sm">This assessment link is invalid or is no longer accepting candidates.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-earth-50 dark:bg-basanite-950 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-900">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center">
          <LogoMark size={24} dark />
          <span className="font-display text-basanite-900 dark:text-earth-100 text-sm ml-2">Basanite</span>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-lg w-full">
          <div className="bg-white dark:bg-basanite-900 border border-earth-200 dark:border-basanite-700 p-8 sm:p-10">
            {roleInfo.company_name && (
              <p className="text-xs text-basanite-400 dark:text-earth-200/40 uppercase tracking-wide font-medium mb-2">{roleInfo.company_name}</p>
            )}
            <h1 className="font-display text-2xl sm:text-3xl text-basanite-900 dark:text-earth-100 mb-4">{roleInfo.role_title}</h1>

            <div className="border-t border-earth-200 dark:border-basanite-700 pt-6 mt-6">
              <h2 className="text-sm font-medium text-basanite-800 dark:text-earth-100 mb-4">What to expect</h2>
              <ul className="space-y-3 text-sm text-basanite-600 dark:text-earth-200/80">
                <li className="flex items-start gap-3">
                  <span className="text-gold-500 mt-0.5 text-xs">&#9670;</span>
                  A conversational voice interview conducted by AI. It typically runs around {roleInfo.interview_duration_minutes ?? 20} minutes, the AI ends it when it has enough signal, so some interviews run longer.
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gold-500 mt-0.5 text-xs">&#9670;</span>
                  You'll be asked about your real experiences and how you think, no trick questions
                </li>
                {typeof roleInfo.dimensions_count === 'number' && roleInfo.dimensions_count > 0 && (
                  <li className="flex items-start gap-3">
                    <span className="text-gold-500 mt-0.5 text-xs">&#9670;</span>
                    Your answers are evaluated across {roleInfo.dimensions_count} capability {roleInfo.dimensions_count === 1 ? 'dimension' : 'dimensions'}
                  </li>
                )}
                <li className="flex items-start gap-3">
                  <span className="text-gold-500 mt-0.5 text-xs">&#9670;</span>
                  You'll get a personal feedback report by email when it's done
                </li>
              </ul>
            </div>

            <Link
              href={`/assess/${token}/consent`}
              className="block w-full text-center mt-8 px-6 py-3.5 bg-basanite-900 dark:bg-gold-500 text-white dark:text-basanite-950 text-sm font-medium hover:bg-gold-600 dark:hover:bg-gold-400 transition-colors"
            >
              Begin Assessment
            </Link>

            <p className="text-xs text-basanite-400 dark:text-earth-200/40 text-center mt-4">
              We&apos;ll explain how your data is used before anything is recorded.
            </p>
          </div>

          <LegalFooter dark className="mt-6" />
        </div>
      </div>
    </div>
  )
}
