// Admin notification emails, sent via the Resend REST API (no SDK — a
// single fetch keeps the web bundle dependency-free).
//
// Recipient resolution, in order:
//   1. ADMIN_NOTIFY_TO (comma-separated) — explicit override
//   2. OPS_ALERT_TO — shared with the Python side's core/email.py
//   3. Every account with app_metadata.is_admin — so admins receive
//      notifications with zero extra configuration
//
// Best-effort by design: a notification failure must never fail the
// user-facing request that triggered it. Callers should await this (so
// serverless runtimes don't kill the send mid-flight) but ignore the
// result. Misconfiguration is logged at error level so a silent inbox is
// diagnosable from server logs.

import { createServiceClient } from '@/lib/supabase/server'

// Resend's sandbox sender only delivers to the address that owns the
// Resend account — every other recipient silently fails.
const SANDBOX_SENDER = 'onboarding@resend.dev'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function envRecipients(): string[] {
  return (process.env.ADMIN_NOTIFY_TO || process.env.OPS_ALERT_TO || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

// Admins can switch these emails off from /dashboard/admin; the flag lives
// in app_metadata (set via /api/admin/notifications) so it applies both to
// the automatic admin-account lookup and to env-configured recipients whose
// address matches an account.
async function resolveRecipients(): Promise<string[]> {
  // One page of 1000 is far beyond the current account count — same
  // assumption as the admin security route; revisit if that changes.
  const service = createServiceClient()
  const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const fromEnv = envRecipients()
  if (error) {
    console.error(`[admin-notify] admin lookup failed: ${error.message}`)
    // Delivery beats preference filtering: fall back to env recipients
    // unfiltered rather than dropping the notification entirely.
    return fromEnv
  }
  const users = data?.users ?? []
  const optedOut = new Set(
    users
      .filter(u => u.app_metadata?.admin_notifications_disabled === true && u.email)
      .map(u => (u.email as string).toLowerCase()),
  )
  const candidates = fromEnv.length > 0
    ? fromEnv
    : users.filter(u => u.app_metadata?.is_admin === true && u.email).map(u => u.email as string)
  return candidates.filter(e => !optedOut.has(e.toLowerCase()))
}

export async function sendAdminNotification(subject: string, lines: string[]): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const sender = process.env.RESEND_FROM || 'Basanite <onboarding@resend.dev>'

  if (!apiKey) {
    console.error(
      '[admin-notify] RESEND_API_KEY is not set in the web app environment '
      + '(web/.env.local locally, project env vars in production) — admin '
      + 'notification NOT sent',
    )
    return false
  }

  let to: string[]
  try {
    to = await resolveRecipients()
  } catch (e) {
    console.error(`[admin-notify] recipient resolution failed: ${e instanceof Error ? e.message : 'error'}`)
    return false
  }
  if (to.length === 0) {
    console.error(
      '[admin-notify] no recipients: set ADMIN_NOTIFY_TO / OPS_ALERT_TO, or '
      + 'ensure at least one account has app_metadata.is_admin (and has not '
      + 'switched email notifications off) — admin notification NOT sent',
    )
    return false
  }

  if (sender.includes(SANDBOX_SENDER)) {
    console.warn(
      '[admin-notify] WARNING: using the Resend sandbox sender '
      + `(${SANDBOX_SENDER}); deliveries to anyone other than the Resend `
      + 'account owner will silently fail. Set RESEND_FROM to a verified domain.',
    )
  }

  // Strip header-breaking characters and cap length, matching core/email.py.
  const safeSubject = subject.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 160) || 'Basanite admin alert'
  const body = lines.map(l => `<p style="font-size:14px;line-height:1.55;color:#333;margin:0 0 8px">${escapeHtml(l)}</p>`).join('')
  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#1a1a1a">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5dccd;padding:32px">
      <p style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a5e;margin:0 0 4px">Basanite</p>
      <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(safeSubject)}</h1>
      ${body}
      <p style="font-size:12px;color:#8a7a5e;margin-top:24px;border-top:1px solid #eee;padding-top:16px">
        You're receiving this because you're a Basanite admin. To stop these
        emails, open your <a href="https://basanite.co.uk/dashboard/admin" style="color:#8a7a5e">admin dashboard</a>
        and switch off &ldquo;Email notifications&rdquo;.
      </p>
    </div>
  </body>
</html>`.trim()

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: sender, to, subject: safeSubject, html }),
    })
    if (!res.ok) {
      // Don't log the response body — it can echo recipient addresses.
      console.error(`[admin-notify] send failed (status ${res.status})`)
      return false
    }
    return true
  } catch (e) {
    console.error(`[admin-notify] send failed: ${e instanceof Error ? e.name : 'error'}`)
    return false
  }
}
