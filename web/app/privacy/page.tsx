import Link from 'next/link'
import { LogoMark } from '@/components/Logo'

export const metadata = { title: 'Basanite — Privacy Notice' }

// Last review date — bump when material changes ship.
const POLICY_VERSION = '2026-05-02'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-earth-50">
      <header className="border-b border-earth-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={24} dark />
            <span className="font-semibold text-basanite-900 text-sm">Basanite</span>
          </Link>
          <Link href="/dashboard" className="text-xs text-basanite-500 hover:text-basanite-900 transition-colors">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 text-basanite-800">
        <h1 className="font-display text-3xl text-basanite-900 mb-2">Privacy Notice</h1>
        <p className="text-sm text-basanite-500 mb-10">
          Effective {POLICY_VERSION}. Version {POLICY_VERSION}.
        </p>

        <Section title="At a glance">
          <ul className="space-y-2 list-disc pl-5">
            <li>We process candidate CVs, voice interviews, and AI-generated scores for the sole purpose of producing an assessment for the hirer who invited the candidate.</li>
            <li>The interview is conducted by an AI agent and scored by AI. You have the right to request human review before any decision is made about you.</li>
            <li>We don&apos;t sell candidate data, and we don&apos;t use it to train any AI model.</li>
            <li>You can <Link href="/data-rights" className="text-gold-600 underline">access, export, or delete</Link> your data at any time.</li>
            <li>Default retention: assessment data 12 months, voice recordings 6 months, after which they are automatically purged.</li>
          </ul>
        </Section>

        <Section title="Who we are">
          <p>
            Basanite (the &ldquo;Platform&rdquo;) is operated by <strong>Basanite Ltd</strong>, registered in the United Kingdom.
            For privacy queries: <a href="mailto:privacy@basanite.co.uk" className="text-gold-600 underline">privacy@basanite.co.uk</a>.
          </p>
          <p className="mt-3">
            <strong>Roles under GDPR:</strong> When you take an assessment, the hirer who invited you (e.g. the company you applied to) is the <em>data controller</em>. Basanite acts as a <em>data processor</em> for that hirer. When you sign up as a hirer, Basanite is the controller for your account information.
          </p>
        </Section>

        <Section title="What we collect">
          <h3 className="font-medium text-basanite-900 mt-4 mb-2">Candidates</h3>
          <ul className="space-y-1 list-disc pl-5">
            <li><strong>Name and email</strong>, captured at signup or pulled from the hirer&apos;s ATS.</li>
            <li><strong>CV text</strong>, either uploaded by you or fetched from the hirer&apos;s ATS attachment.</li>
            <li><strong>Voice recording</strong> of the interview (audio only) and a written transcript.</li>
            <li><strong>AI-generated scores and reports</strong> across the dimensions the hirer has configured.</li>
            <li><strong>Consent records</strong> — every consent you grant or withdraw is logged with timestamp.</li>
          </ul>

          <h3 className="font-medium text-basanite-900 mt-6 mb-2">Hirers</h3>
          <ul className="space-y-1 list-disc pl-5">
            <li>Account email, name, and password hash (handled by Supabase Auth).</li>
            <li>Roles you create — title, company name, job description, evaluation dimensions.</li>
            <li>Encrypted ATS connection tokens (AES-GCM at rest, decrypted only in memory at the moment of an API call).</li>
          </ul>

          <h3 className="font-medium text-basanite-900 mt-6 mb-2">Visitors / waitlist</h3>
          <ul className="space-y-1 list-disc pl-5">
            <li>If you sign up to the waitlist: name, email, optional company.</li>
            <li>Standard server logs (IP, request path, timestamp). IPs are masked at the last octet within 24 hours of capture.</li>
          </ul>
        </Section>

        <Section title="Why we process it (legal bases)">
          <ul className="space-y-2 list-disc pl-5">
            <li><strong>Performance of contract / pre-contract steps (Art. 6(1)(b))</strong> — for delivering the assessment you started.</li>
            <li><strong>Legitimate interests (Art. 6(1)(f))</strong> — for fraud prevention, security, and product improvement (in aggregate, never identifying you).</li>
            <li><strong>Consent (Art. 6(1)(a))</strong> — for the voice recording, AI scoring, and CV processing. You can withdraw at any time without affecting prior lawful processing.</li>
            <li><strong>Legal obligation (Art. 6(1)(c))</strong> — to respond to lawful requests from regulators or law enforcement.</li>
          </ul>
        </Section>

        <Section title="Special category data">
          <p>
            Voice recordings can constitute biometric data, and free-text interviews may inadvertently reveal information about your health, beliefs, or other special categories. We collect this on the basis of your <strong>explicit consent</strong> (Art. 9(2)(a)), which we ask for at the start of the interview. You can withdraw at any time and we will erase the recording and transcript on request within 30 days.
          </p>
        </Section>

        <Section title="AI scoring and your right to human review (Article 22)">
          <p>
            The interview is conducted by an AI agent. Scores and dimension assessments are generated by AI and presented to the hirer. Under Article 22 of the UK GDPR, you have the right not to be subject to a decision based <em>solely</em> on automated processing where it produces legal or similarly significant effects.
          </p>
          <p className="mt-3">
            Before you start the interview we ask whether you object to fully automated decisions about you. If you object, we flag your assessment so the hirer must apply human review before relying on any score in a hiring decision. You can also <Link href="/data-rights" className="text-gold-600 underline">register an objection at any later time</Link>.
          </p>
        </Section>

        <Section title="Where we send it (sub-processors)">
          <p>
            We use the following sub-processors. Each receives only the data it needs for its function. See the <Link href="/legal/subprocessors" className="text-gold-600 underline">full sub-processors list</Link> for current providers, locations, and Data Processing Agreement status.
          </p>
          <ul className="space-y-1 list-disc pl-5 mt-3">
            <li><strong>Supabase</strong> — database, authentication, storage of recordings.</li>
            <li><strong>Anthropic</strong> — AI inference for CV extraction, interview conduct, and scoring.</li>
            <li><strong>ElevenLabs</strong> — voice agent serving the live interview audio.</li>
            <li><strong>Resend</strong> — transactional email delivery (invites, reports).</li>
            <li><strong>Merge.dev</strong> — unified ATS API for hirers who connect Greenhouse, Lever, Ashby etc.</li>
            <li><strong>Vercel and Render</strong> — hosting for frontend and backend.</li>
          </ul>
          <p className="mt-3">
            Some sub-processors are based outside the UK/EU. For US-based providers we rely on the UK Extension to the EU-US Data Privacy Framework or Standard Contractual Clauses. See the sub-processors page for details per provider.
          </p>
        </Section>

        <Section title="How long we keep it (retention)">
          <ul className="space-y-1 list-disc pl-5">
            <li><strong>Voice recordings:</strong> 6 months from interview completion, then automatically deleted.</li>
            <li><strong>Interview transcripts and AI scores:</strong> 12 months from completion, then automatically deleted.</li>
            <li><strong>Hirer reports:</strong> 12 months from completion, then automatically deleted (PDFs may have been downloaded by the hirer; that copy is outside our control).</li>
            <li><strong>CV text:</strong> 12 months from upload, then automatically deleted.</li>
            <li><strong>Hirer accounts:</strong> kept until the hirer deletes their account; deletion cascades to all associated data within 30 days.</li>
            <li><strong>Waitlist entries:</strong> kept until acted on (approved / rejected) or until you ask us to delete.</li>
            <li><strong>Consent records and DSAR audit trail:</strong> retained for 6 years as required for legal defence.</li>
          </ul>
          <p className="mt-3">
            You can request earlier erasure at any time via the <Link href="/data-rights" className="text-gold-600 underline">data-rights page</Link>.
          </p>
        </Section>

        <Section title="Your rights">
          <p>Under the UK GDPR you have the right to:</p>
          <ul className="space-y-1 list-disc pl-5 mt-3">
            <li><strong>Access</strong> a copy of the personal data we hold on you.</li>
            <li><strong>Rectify</strong> inaccurate data.</li>
            <li><strong>Erase</strong> your data (&ldquo;right to be forgotten&rdquo;).</li>
            <li><strong>Restrict</strong> or <strong>object to</strong> processing — including the right not to be subject to automated decisions.</li>
            <li><strong>Portability</strong> — receive your data in a structured, machine-readable format.</li>
            <li><strong>Withdraw consent</strong> at any time.</li>
            <li><strong>Lodge a complaint</strong> with the UK Information Commissioner&apos;s Office (<a href="https://ico.org.uk" className="text-gold-600 underline" target="_blank" rel="noreferrer">ico.org.uk</a>).</li>
          </ul>
          <p className="mt-3">
            Submit any of these requests via the <Link href="/data-rights" className="text-gold-600 underline">self-serve data-rights page</Link> or by emailing <a href="mailto:privacy@basanite.co.uk" className="text-gold-600 underline">privacy@basanite.co.uk</a>. We respond within 30 days.
          </p>
        </Section>

        <Section title="Security">
          <p>
            We use TLS 1.2+ in transit, encryption at rest for the database and ATS tokens, RLS-enforced access scoping in the database, and short-lived session tokens. Recordings are stored in a deny-by-default bucket only the backend service role can read.
          </p>
        </Section>

        <Section title="Children">
          <p>
            Basanite is intended for users aged 16 or over. We ask candidates to confirm they are at least 16 before starting an interview. If you are under 16, please do not use the platform; if you have already submitted information and are under 16, contact us and we will erase it.
          </p>
        </Section>

        <Section title="Changes to this notice">
          <p>
            When we change this notice we update the version date at the top and, for material changes, notify users by email or in-app banner. Previous versions are kept on file and available on request.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            <strong>Privacy enquiries:</strong> <a href="mailto:privacy@basanite.co.uk" className="text-gold-600 underline">privacy@basanite.co.uk</a><br />
            <strong>Postal:</strong> Basanite Ltd, 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom.<br />
            <strong>UK Information Commissioner:</strong> <a href="https://ico.org.uk" className="text-gold-600 underline" target="_blank" rel="noreferrer">ico.org.uk</a> · 0303 123 1113.
          </p>
        </Section>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-xl text-basanite-900 mb-3">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  )
}
