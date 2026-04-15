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
    return NextResponse.json({ success: true, message: 'Verification email sent to new address.' })
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

  // Delete all user data first
  const { data: searches } = await service
    .from('job_searches')
    .select('id')
    .eq('user_id', user.id)

  if (searches?.length) {
    const ids = searches.map(s => s.id)
    await service.from('candidates').delete().in('job_search_id', ids)
    await service.from('job_searches').delete().in('id', ids)
  }

  // Delete the auth user via admin API
  const { error } = await service.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('Account delete error:', error)
    return NextResponse.json({ error: 'Failed to delete account.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
