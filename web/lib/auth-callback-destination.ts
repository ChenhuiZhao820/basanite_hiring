/**
 * Decides where /auth/callback should send the browser after a successful
 * code exchange.
 *
 * Split out from app/auth/callback/page.tsx so the branching is testable
 * without a live Supabase session: `isRecovery` should come from the
 * PASSWORD_RECOVERY auth event, not from the URL's `next` query param.
 * Confirmed empirically (2026-08-06) that Supabase's PKCE redirect
 * reliably keeps `code` in the callback URL but does not reliably keep a
 * custom `next` query param for a successful recovery exchange, even
 * though it does keep `next` on the expired/error redirect. Trusting
 * `next` alone silently sent password-reset users to /dashboard instead
 * of /set-password.
 */
export function resolveCallbackDestination(next: string, isRecovery: boolean): string {
  if (isRecovery) return '/set-password'
  if (next === '/dashboard') return '/login?verified=1'
  return next
}
