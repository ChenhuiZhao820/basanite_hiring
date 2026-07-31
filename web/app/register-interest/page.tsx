import type { Metadata } from 'next'
import { SiteNav } from '@/components/SiteNav'
import { StoneTexture } from '@/components/StoneTexture'
import { InterestForm } from '@/components/InterestForm'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Register interest',
  description:
    'Register your interest in Basanite and we\u2019ll reach out with early access \u2014 whether you hire, interview, or are looking for your next role.',
  path: '/register-interest',
})

export default function RegisterInterestPage() {
  return (
    <div className="min-h-screen bg-basanite-900 text-earth-50">
      <SiteNav />

      <main className="relative overflow-hidden px-6 pt-32 pb-24">
        <StoneTexture />
        <div className="relative z-10 max-w-2xl mx-auto">
          <header className="text-center mb-12">
            <p className="text-gold-400 text-[11px] font-semibold uppercase tracking-[0.25em] mb-5">
              Early access
            </p>
            <h1 className="font-display text-earth-50 text-4xl sm:text-5xl leading-[1.05] mb-5">
              Register your interest.
            </h1>
            <p className="text-earth-300 text-lg leading-relaxed max-w-xl mx-auto">
              Tell us who you are and how to reach you &mdash; we&rsquo;ll be in touch as access
              opens up. Three quick questions, nothing else.
            </p>
          </header>

          <InterestForm />

          <p className="text-xs text-earth-300/70 mt-10 text-center">
            Already have access? <a href="/login" className="text-gold-400 hover:text-gold-300 underline">Sign in</a>
            <span className="mx-2 text-earth-300/40">&middot;</span>
            More questions first? <a href="/faq" className="text-gold-400 hover:text-gold-300 underline">See the FAQ</a>.
          </p>
        </div>
      </main>
    </div>
  )
}
