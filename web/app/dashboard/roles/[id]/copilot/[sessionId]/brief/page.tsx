import { getAuthUserId } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CopilotBriefView } from '@/components/copilot/CopilotBriefView'

export const metadata = { title: 'Interview Brief' }

export default async function CopilotBriefPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id, sessionId } = await params
  const userId = await getAuthUserId()
  if (!userId) redirect('/login')

  return (
    <div>
      <Link href={`/dashboard/roles/${id}`} className="text-xs text-basanite-400 dark:text-earth-500 hover:text-basanite-600 dark:hover:text-earth-300 transition-colors mb-2 inline-block">
        &larr; Back to role
      </Link>
      <h1 className="font-display text-2xl text-basanite-900 dark:text-earth-100 mb-1">Interview brief</h1>
      <p className="text-sm text-basanite-500 dark:text-earth-400 mb-8">
        The approved plan for this role, plus what this candidate&apos;s CV makes worth probing.
      </p>
      <CopilotBriefView roleId={id} sessionId={sessionId} />
    </div>
  )
}
