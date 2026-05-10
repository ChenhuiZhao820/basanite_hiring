import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  if (body.type === 'profile') {
    const name = body.name?.trim() ?? ''
    if (name.length > 100) return NextResponse.json({ error: 'Name is too long.' }, { status: 400 })
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } })
    if (error) return NextResponse.json({ error: 'Failed to update profile.' }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  if (body.type === 'email') {
    const email = body.email?.trim() ?? ''
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }
    if (!body.currentPassword) {
      return NextResponse.json({ error: 'Current password is required to change your email.' }, { status: 400 })
    }
    const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email!, password: body.currentPassword })
    if (authError) return NextResponse.json({ error: 'Incorrect password.' }, { status: 403 })
    const { error } = await supabase.auth.updateUser({ email })
    if (error) return NextResponse.json({ error: 'Failed to update email.' }, { status: 400 })
    // ENG-58: revoke all sessions on email change so the verification
    // step is the only re-entry. Without this, a brief account
    // compromise could be turned into long-term access by setting an
    // attacker-controlled email — the original session would persist
    // regardless of whether the new email was ever verified, and the
    // attacker would gain a parallel verified path on top.
    await supabase.auth.signOut({ scope: 'global' })
    return NextResponse.json({
      success: true,
      message: 'Verification email sent. You\'ve been signed out — sign in again with your new email after verifying it.',
    })
  }

  if (body.type === 'password') {
    if (!body.newPassword || body.newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }
    if (body.newPassword.length > 128) {
      return NextResponse.json({ error: 'Password is too long.' }, { status: 400 })
    }
    if (!body.currentPassword) {
      return NextResponse.json({ error: 'Current password is required.' }, { status: 400 })
    }
    const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email!, password: body.currentPassword })
    if (authError) return NextResponse.json({ error: 'Incorrect current password.' }, { status: 403 })
    const { error } = await supabase.auth.updateUser({ password: body.newPassword })
    if (error) return NextResponse.json({ error: 'Failed to update password.' }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown update type' }, { status: 400 })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  // ENG-61: revoke every session before tearing down the user record.
  // admin.deleteUser invalidates new auth attempts, but in-flight
  // refresh tokens on other devices could otherwise stay usable for a
  // brief window — explicit signOut({ scope: 'global' }) closes that.
  await supabase.auth.signOut({ scope: 'global' })

  // Roles (and their assessments, sessions, scores, reports) cascade via FK on user_id.
  const { error } = await service.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('Account delete error:', error)
    return NextResponse.json({ error: 'Failed to delete account.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
