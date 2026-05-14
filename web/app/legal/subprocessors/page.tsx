import type { Metadata } from 'next'
import Link from 'next/link'
import { LogoMark } from '@/components/Logo'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Sub-processors',
  description: 'Every third-party service Basanite uses, the data it sees, where the servers live, and how the cross-border transfer is legitimised under UK GDPR.',
  path: '/legal/subprocessors',
})

type SubProcessor = {
  name: string
  purpose: string
  data: string
  region: string
  transfer: string
  dpa: string
  link: string
}

// Per-provider snapshot of WHAT data goes there, WHERE the servers live, and
// HOW the cross-border transfer is legitimised. Refresh whenever a provider
// changes or we add/remove one.
const SUBPROCESSORS: SubProcessor[] = [
  {
    name: 'Supabase Inc.',
    purpose: 'Primary database, authentication, and storage (interview recordings)',
    data: 'All structured data: candidate name/email, CV text, transcripts, scores, reports, recordings, account credentials',
    region: 'AWS us-east-1 (United States)',
    transfer: 'UK Extension to the EU-US Data Privacy Framework + SCCs',
    dpa: 'Standard DPA available; will be executed prior to processing live customer data',
    link: 'https://supabase.com/privacy',
  },
  {
    name: 'Anthropic, PBC',
    purpose: 'AI inference — CV extraction, interview agent, dimension scoring, report generation',
    data: 'CV text, interview transcripts (in-flight only), role configuration. Anthropic does not retain or train on data by default and Basanite has not opted in to any training programme.',
    region: 'United States',
    transfer: 'Standard Contractual Clauses (SCCs)',
    dpa: 'Standard DPA available; will be executed prior to processing live customer data',
    link: 'https://www.anthropic.com/privacy',
  },
  {
    name: 'ElevenLabs Inc.',
    purpose: 'Conversational voice agent that conducts the live interview',
    data: 'Live audio stream during the interview. ElevenLabs may retain conversation logs for a short debugging window per their terms.',
    region: 'United States',
    transfer: 'Standard Contractual Clauses (SCCs)',
    dpa: 'Standard DPA available; will be executed prior to processing live customer data',
    link: 'https://elevenlabs.io/privacy',
  },
  {
    name: 'Merge.dev, Inc.',
    purpose: 'Unified ATS API — pulls candidate applications from Greenhouse, Lever, Ashby etc. and pushes results back',
    data: 'ATS-linked-account tokens (encrypted), candidate names/emails, CV attachments, assessment results',
    region: 'United States',
    transfer: 'Standard Contractual Clauses (SCCs)',
    dpa: 'Standard DPA available; will be executed prior to processing live customer data',
    link: 'https://www.merge.dev/legal/privacy-policy',
  },
  {
    name: 'Resend, Inc.',
    purpose: 'Transactional email delivery (invites, feedback reports, ops alerts)',
    data: 'Recipient email address, candidate name, role title, feedback report content',
    region: 'United States',
    transfer: 'Standard Contractual Clauses (SCCs)',
    dpa: 'Standard DPA available; will be executed prior to processing live customer data',
    link: 'https://resend.com/legal/privacy-policy',
  },
  {
    name: 'Vercel Inc.',
    purpose: 'Frontend hosting + edge network',
    data: 'Request metadata (IP, user-agent, path) for the marketing site and dashboard. No application personal data is processed by Vercel functions in this deployment.',
    region: 'Global edge; primary US',
    transfer: 'Standard Contractual Clauses (SCCs)',
    dpa: 'Standard DPA available; will be executed prior to processing live customer data',
    link: 'https://vercel.com/legal/privacy-policy',
  },
  {
    name: 'Render Services Inc.',
    purpose: 'Backend hosting (FastAPI service that orchestrates AI calls)',
    data: 'In-flight: all candidate and hirer data passes through this service. At rest: 30-day rolling logs (PII-scrubbed by application code).',
    region: 'AWS us-east (United States)',
    transfer: 'Standard Contractual Clauses (SCCs)',
    dpa: 'Standard DPA available; will be executed prior to processing live customer data',
    link: 'https://render.com/privacy',
  },
]

const POLICY_VERSION = '2026-05-07'

export default function SubprocessorsPage() {
  return (
    <div className="min-h-screen bg-earth-50">
      <header className="border-b border-earth-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={24} dark />
            <span className="font-semibold text-basanite-900 text-sm">Basanite</span>
          </Link>
          <Link href="/dashboard" className="text-xs text-basanite-500 hover:text-basanite-900 transition-colors">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 text-basanite-800">
        <p className="text-xs text-basanite-500 mb-2">
          <Link href="/privacy" className="hover:underline">← Privacy notice</Link>
        </p>
        <h1 className="font-display text-3xl text-basanite-900 mb-2">Sub-processors</h1>
        <p className="text-sm text-basanite-500 mb-10">
          List version {POLICY_VERSION}. We notify customers of material changes (additions, removals, jurisdictional changes) at least 30 days before they take effect.
        </p>

        <p className="text-sm leading-relaxed mb-10">
          A sub-processor is a third-party service we engage to help us deliver Basanite. Before processing live customer data we execute a Data Processing Agreement (DPA) with each sub-processor that contractually requires them to handle personal data only on our documented instructions and to apply at least the security standards we apply. Per-provider DPA status is shown below.
        </p>

        <div className="space-y-6">
          {SUBPROCESSORS.map(p => (
            <article key={p.name} className="border border-earth-200 bg-white p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h2 className="font-display text-lg text-basanite-900">{p.name}</h2>
                  <p className="text-xs text-basanite-500 mt-1">{p.purpose}</p>
                </div>
                <a href={p.link} target="_blank" rel="noreferrer" className="text-xs text-gold-600 hover:underline whitespace-nowrap">
                  Privacy policy →
                </a>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm mt-4">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-basanite-400 mb-1">Data shared</dt>
                  <dd>{p.data}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-basanite-400 mb-1">Region</dt>
                  <dd>{p.region}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-basanite-400 mb-1">Transfer mechanism</dt>
                  <dd>{p.transfer}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-basanite-400 mb-1">DPA status</dt>
                  <dd>{p.dpa}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>

        <section className="mt-12 border-t border-earth-200 pt-8 text-sm">
          <p>
            Questions about a specific sub-processor or to request a copy of an executed DPA: <a href="mailto:privacy@basanite.co.uk" className="text-gold-600 underline">privacy@basanite.co.uk</a>.
          </p>
        </section>
      </main>
    </div>
  )
}
