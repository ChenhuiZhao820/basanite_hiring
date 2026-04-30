import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/validate'

// Server-side handler for email-link auth (invite, signup, recovery, magiclink,
// email_change). Uses verifyOtp with token_hash so it works for users who never
// had a PKCE code_verifier in their browser (e.g. admin-issued invites).
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const next = safeNext(url.searchParams.get('next'), '/dashboard')

  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL(
        '/login?error=' + encodeURIComponent('Missing verification token. Please check your email link.'),
        url.origin,
      ),
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash, type })
  if (error) {
    return NextResponse.redirect(
      new URL(
        '/login?error=' + encodeURIComponent('Verification link has expired or has already been used. Please request a new one.'),
        url.origin,
      ),
    )
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
