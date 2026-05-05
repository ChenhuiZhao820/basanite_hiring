import Link from 'next/link'
import { createServiceClient, getAuthUserId } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CustomVoiceRow } from './CustomVoiceRow'

export const metadata = { title: 'Basanite — Voices' }

type Voice = {
  id: string
  org_id: string
  eleven_voice_id: string
  name: string
  description: string | null
  sample_url: string | null
  created_at: string
}

export default async function VoicesPage() {
  const userId = await getAuthUserId()
  if (!userId) redirect('/login')

  const service = createServiceClient()

  // Personal-org convention: id = user_id (set up in migration 026).
  // Same resolution rule as everywhere else on the dashboard, so we don't
  // need a roundtrip to FastAPI just to render the page.
  const orgId = userId

  const { data: voices } = await service
    .from('org_custom_voices')
    .select('id, org_id, eleven_voice_id, name, description, sample_url, created_at')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const list = (voices ?? []) as Voice[]

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl text-basanite-900 dark:text-earth-100 mb-1">Cloned voices</h1>
          <p className="text-sm text-basanite-500 dark:text-earth-400">
            Record your own voice once and use it as the interviewer voice on any role. Available to your whole team.
          </p>
        </div>
        <Link
          href="/dashboard/voices/new"
          className="bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white text-sm font-medium px-4 py-2 transition-colors whitespace-nowrap"
        >
          + Clone a voice
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-10 text-center">
          <p className="font-display text-base text-basanite-900 dark:text-earth-100 mb-2">No cloned voices yet</p>
          <p className="text-sm text-basanite-500 dark:text-earth-400 max-w-md mx-auto">
            Read a 60-second prompt and we&rsquo;ll create a voice your team can pick from any role&rsquo;s voice picker.
          </p>
        </div>
      ) : (
        <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 divide-y divide-earth-200 dark:divide-basanite-700">
          {list.map(v => (
            <CustomVoiceRow key={v.id} voice={v} />
          ))}
        </div>
      )}
    </div>
  )
}
