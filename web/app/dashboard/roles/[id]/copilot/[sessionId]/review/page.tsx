import { getAuthUserId } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CopilotReviewForm } from '@/components/copilot/CopilotReviewForm'

export const metadata = { title: 'Review Scores' }

export default async function CopilotReviewPage({
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
      <h1 className="font-display text-2xl text-basanite-900 dark:text-earth-100 mb-1">Review &amp; sign off</h1>
      <p className="text-sm text-basanite-500 dark:text-earth-400 mb-8">
        Proposed scores with the statements that ground them. Confirm or override — your signature is the score of record.
      </p>
      <CopilotReviewForm roleId={id} sessionId={sessionId} />
    </div>
  )
}
