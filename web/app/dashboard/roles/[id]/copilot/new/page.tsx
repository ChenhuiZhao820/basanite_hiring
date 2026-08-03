import { createServiceClient, getAuthUserId } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AdHocCandidateForm } from '@/components/copilot/AdHocCandidateForm'

export const metadata = { title: 'New Copilot Interview' }

export default async function NewCopilotInterviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userId = await getAuthUserId()
  if (!userId) redirect('/login')

  const service = createServiceClient()
  const { data: role } = await service
    .from('roles')
    .select('id, title, company_name, status, interview_plan')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!role) redirect('/dashboard')
  // Copilot interviews run off the approved, locked interview plan — the
  // same rubric autonomous interviews use, so scores stay comparable.
  if (role.status !== 'live') redirect(`/dashboard/roles/${id}`)

  return (
    <div>
      <Link href={`/dashboard/roles/${id}`} className="text-xs text-basanite-400 dark:text-earth-500 hover:text-basanite-600 dark:hover:text-earth-300 transition-colors mb-2 inline-block">
        &larr; Back to role
      </Link>
      <h1 className="font-display text-2xl text-basanite-900 dark:text-earth-100 mb-1">Copilot interview</h1>
      <p className="text-sm text-basanite-500 dark:text-earth-400 mb-8">
        {role.title}{role.company_name ? ` · ${role.company_name}` : ''} — you run the conversation, Basanite listens and keeps score.
      </p>
      <AdHocCandidateForm roleId={role.id} />
    </div>
  )
}
