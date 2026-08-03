// Admin notification emails, sent via the Resend REST API (no SDK — a
// single fetch keeps the web bundle dependency-free). Mirrors the Python
// side's core/email.py send_ops_alert: ADMIN_NOTIFY_TO (comma-separated)
// controls recipients, falling back to OPS_ALERT_TO, then the founder
// mailbox, so both halves of the stack alert the same people.
//
// Best-effort by design: a notification failure must never fail the
// user-facing request that triggered it. Callers should await this (so
// serverless runtimes don't kill the send mid-flight) but ignore the result.

const FALLBACK_TO = 'andrew.robertson@basanite.co.uk'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendAdminNotification(subject: string, lines: string[]): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const sender = process.env.RESEND_FROM ?? 'Basanite <onboarding@resend.dev>'
  const to = (process.env.ADMIN_NOTIFY_TO ?? process.env.OPS_ALERT_TO ?? FALLBACK_TO)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  if (!apiKey || to.length === 0) {
    console.log('[admin-notify] skipped (RESEND_API_KEY or recipients missing)')
    return false
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
        You're receiving this because you're a Basanite admin.
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
