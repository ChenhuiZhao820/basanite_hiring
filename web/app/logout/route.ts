import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Universal sign-out. Visit /logout from anywhere to sign out and land on /login.
export async function GET(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const origin = new URL(request.url).origin
  return NextResponse.redirect(new URL('/login', origin))
}
