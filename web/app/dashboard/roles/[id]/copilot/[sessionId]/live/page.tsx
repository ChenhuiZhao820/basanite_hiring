import { getAuthUserId } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CopilotLivePanel } from '@/components/copilot/CopilotLivePanel'

export const metadata = { title: 'Live Interview' }

export default async function CopilotLivePage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id, sessionId } = await params
  const userId = await getAuthUserId()
  if (!userId) redirect('/login')

  return (
    <div>
      <h1 className="font-display text-2xl text-basanite-900 dark:text-earth-100 mb-1">Live interview</h1>
      <p className="text-sm text-basanite-500 dark:text-earth-400 mb-8">
        You run the conversation. Glance here for saturation, probes, and pacing — scores unlock at wrap-up.
      </p>
      <CopilotLivePanel roleId={id} sessionId={sessionId} />
    </div>
  )
}
