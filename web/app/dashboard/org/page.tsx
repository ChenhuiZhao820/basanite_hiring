// Org settings page. Server-renders the active org + members + pending
// invitations, hands editable bits off to client components.

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUserEmail, getAuthUserId } from '@/lib/supabase/server'
import { OrgProfileForm } from './_components/OrgProfileForm'
import { MembersTable } from './_components/MembersTable'
import { InviteForm } from './_components/InviteForm'
import { OrgDangerZone } from './_components/OrgDangerZone'
import { pipelineFetch } from '@/lib/orgs-proxy'

export const metadata = { title: 'Basanite — Organisation' }

type Org = {
  id: string
  name: string
  description: string | null
  auto_join_domain: string | null
  created_at: string
}
type Member = {
  user_id: string
  role: 'owner' | 'admin' | 'member' | string
  joined_at: string
  email: string | null
  full_name: string | null
}
type Invitation = {
  id: string
  email: string
  role: string
  expires_at: string
  created_at: string
}

async function loadActiveOrg(userId: string): Promise<{ org: Org; members: Member[]; invitations: Invitation[]; viewer_role: string } | null> {
  // Resolve the user's active org_id.
  const activeRes = await pipelineFetch(`/orgs/active?user_id=${encodeURIComponent(userId)}`)
  if (!activeRes.ok) return null
  const { active_org_id: activeOrgId } = await activeRes.json()
  if (!activeOrgId) return null
  const detailRes = await pipelineFetch(
    `/orgs/${encodeURIComponent(activeOrgId)}?user_id=${encodeURIComponent(userId)}`,
  )
  if (!detailRes.ok) return null
  return await detailRes.json()
}

export default async function OrgSettingsPage() {
  const userId = await getAuthUserId()
  if (!userId) redirect('/login')

  const email = await getAuthUserEmail()
  const userEmailDomain = email?.split('@')[1]?.toLowerCase() ?? null

  const data = await loadActiveOrg(userId)
  if (!data) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-display text-2xl text-basanite-900 dark:text-earth-100 mb-3">Organisation</h1>
        <p className="text-sm text-basanite-500 dark:text-earth-400">
          Couldn&rsquo;t load organisation details. Try refreshing.
        </p>
      </div>
    )
  }

  const { org, members, invitations, viewer_role } = data
  const canManage = viewer_role === 'owner' || viewer_role === 'admin'
  const isOwner = viewer_role === 'owner'
  const isPersonal = org.id === userId && members.length === 1

  return (
    <div className="max-w-3xl space-y-8">
      <Link href="/dashboard" className="text-xs text-basanite-400 dark:text-earth-500 hover:text-basanite-600 dark:hover:text-earth-300 transition-colors -mb-4 inline-block">
        &larr; Back to dashboard
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-basanite-900 dark:text-earth-100 mb-1">{org.name}</h1>
          <p className="text-xs text-basanite-500 dark:text-earth-400">
            {isPersonal ? 'Your personal workspace' : `${members.length} member${members.length === 1 ? '' : 's'}`}
            {viewer_role && (
              <span className="ml-2 text-[10px] uppercase tracking-wide text-basanite-400 dark:text-earth-500">
                You are {viewer_role}
              </span>
            )}
          </p>
        </div>
        <Link
          href="/dashboard/org/new"
          className="text-xs text-basanite-600 dark:text-earth-300 border border-earth-200 dark:border-basanite-700 hover:border-earth-300 dark:hover:border-basanite-700 px-3 py-1.5 transition-colors"
        >
          + New organisation
        </Link>
      </div>

      {isPersonal && (
        <div className="border border-gold-500/40 bg-gold-500/5 p-4 text-sm text-basanite-700 dark:text-earth-200">
          <p className="font-medium mb-1 text-basanite-900 dark:text-earth-100">This is your personal workspace.</p>
          <p className="text-basanite-600 dark:text-earth-300">
            Rename it to your company below, set an auto-join domain so future signups from your team join automatically, and invite teammates by email.
          </p>
        </div>
      )}

      <section>
        <h2 className="font-display text-lg text-basanite-900 dark:text-earth-100 mb-3">Profile</h2>
        <OrgProfileForm
          orgId={org.id}
          initialName={org.name}
          initialDescription={org.description}
          initialAutoJoinDomain={org.auto_join_domain}
          userEmailDomain={userEmailDomain}
          canEdit={canManage}
        />
      </section>

      <section>
        <h2 className="font-display text-lg text-basanite-900 dark:text-earth-100 mb-3">Members</h2>
        <MembersTable
          orgId={org.id}
          members={members}
          viewerUserId={userId}
          viewerRole={viewer_role}
        />
      </section>

      {canManage && (
        <section>
          <h2 className="font-display text-lg text-basanite-900 dark:text-earth-100 mb-3">Invite teammates</h2>
          <InviteForm orgId={org.id} pendingInvitations={invitations} />
        </section>
      )}

      {isOwner && !isPersonal && (
        <section>
          <h2 className="font-display text-lg text-red-600 dark:text-red-400 mb-3">Danger zone</h2>
          <OrgDangerZone orgId={org.id} orgName={org.name} />
        </section>
      )}
    </div>
  )
}
