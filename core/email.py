"""
Outbound email via Resend. Currently used only for candidate report delivery.
"""
import os
import re
from html import escape

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$")


def _strip_header(value: str) -> str:
    """Drop CR/LF and other characters that could break out of a header value."""
    return re.sub(r"[\r\n\t]+", " ", value or "").strip()


def _bullet_list(items: list[str]) -> str:
    if not items:
        return ""
    lis = "".join(f"<li style='margin-bottom:6px'>{escape(i)}</li>" for i in items)
    return f"<ul style='padding-left:20px;margin:0'>{lis}</ul>"


def _render_report_html(candidate_name: str, role_title: str, report: dict) -> str:
    summary = escape(report.get("summary") or "")
    strengths = _bullet_list(report.get("strengths") or [])
    areas = _bullet_list(report.get("areas_for_development") or [])
    overall = escape(report.get("overall_impression") or "")

    def section(title: str, body: str) -> str:
        if not body:
            return ""
        return (
            f"<h2 style='font-size:16px;margin:24px 0 8px;color:#1a1a1a'>{title}</h2>"
            f"<div style='font-size:14px;line-height:1.55;color:#333'>{body}</div>"
        )

    return f"""
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#1a1a1a">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5dccd;padding:32px">
      <p style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a5e;margin:0 0 4px">Basanite</p>
      <h1 style="font-size:22px;margin:0 0 8px">Your feedback report</h1>
      <p style="font-size:14px;color:#555;margin:0 0 24px">
        Hi {escape(candidate_name or "there")}, thanks for completing the {escape(role_title)} assessment.
        Here's your feedback.
      </p>

      {section("Summary", f"<p style='margin:0'>{summary}</p>" if summary else "")}
      {section("What you did well", strengths)}
      {section("Areas for development", areas)}
      {section("Overall", f"<p style='margin:0;font-style:italic;color:#444'>{overall}</p>" if overall else "")}

      <p style="font-size:12px;color:#8a7a5e;margin-top:32px;border-top:1px solid #eee;padding-top:16px">
        Keep this email — it&rsquo;s your personal copy of the report.
      </p>
      {_LEGAL_FOOTER_HTML}
    </div>
  </body>
</html>
""".strip()


# Shared footer block included at the bottom of every transactional email
# we send. Carries the controller-of-record (Article 13(1)(a)) info, a
# reachable contact for privacy queries, and a link to the self-serve
# data-rights page so the email itself can serve as a vehicle for the
# user to opt out of further communications or erase their data.
_LEGAL_FOOTER_HTML = """
<div style="font-size:11px;color:#8a7a5e;margin-top:24px;padding-top:16px;border-top:1px solid #eee;line-height:1.55">
  <p style="margin:0">
    Privacy queries: <a href="mailto:privacy@basanite.co.uk" style="color:#8a7a5e">privacy@basanite.co.uk</a>
    · <a href="https://basanite.co.uk/privacy" style="color:#8a7a5e">Privacy notice</a>
    · <a href="https://basanite.co.uk/data-rights" style="color:#8a7a5e">Manage your data</a>
  </p>
</div>
""".strip()


_SANDBOX_SENDERS = ("onboarding@resend.dev",)


def _scrub_recipient(text: str, recipient: str) -> str:
    """Replace any occurrence of the recipient address in a log string."""
    if not text or not recipient:
        return text or ""
    return text.replace(recipient, "<recipient>")


def send_report_email(
    to: str,
    candidate_name: str,
    role_title: str,
    report: dict,
) -> bool:
    """
    Send the candidate their feedback report. Returns True on success, False otherwise.
    Safe to call even if Resend is unconfigured, logs and returns False.
    """
    api_key = os.getenv("RESEND_API_KEY", "")
    sender = os.getenv("RESEND_FROM", "Basanite <onboarding@resend.dev>")
    # Do not log the recipient address — PII in server logs.
    if not api_key:
        print("  [email] skipped (RESEND_API_KEY missing)")
        return False
    if not to or not _EMAIL_RE.match(to):
        print("  [email] skipped (recipient missing or malformed)")
        return False

    # Sandbox sender (onboarding@resend.dev) only delivers to the email address
    # registered to the Resend account — every other address silently fails.
    # Warn loudly so this misconfig is obvious in production logs.
    if any(s in sender for s in _SANDBOX_SENDERS):
        print(
            "  [email] WARNING: using Resend sandbox sender "
            f"({sender!r}); deliveries to anyone other than the Resend "
            "account email will fail. Set RESEND_FROM to a verified domain."
        )

    safe_role = _strip_header(role_title)[:140] or "your interview"
    try:
        import resend
        resend.api_key = api_key
        resp = resend.Emails.send({
            "from": sender,
            "to": [to],
            "subject": f"Your Basanite feedback, {safe_role}",
            "html": _render_report_html(candidate_name, safe_role, report),
        })
        # Resend returns a dict like {"id": "uuid"} on success.
        msg_id = (resp or {}).get("id") if isinstance(resp, dict) else None
        if msg_id:
            print(f"  [email] sent (resend id={msg_id})")
            return True
        # No id → Resend may have returned an error envelope rather than raising.
        print(f"  [email] send returned no id; payload type={type(resp).__name__}")
        return False
    except Exception as e:
        # Exception text from Resend can include the recipient address; scrub
        # it AND any other PII pattern (phone, API key) defensively.
        from core.log_safe import scrub
        print(f"  [email] send failed: {type(e).__name__}: {scrub(str(e))}")
        return False


# ─── Candidate invite (PR5/PR6) ────────────────────────────────────────────

def _render_invite_html(candidate_name: str, role_title: str, company_name: str | None, invite_url: str, duration_minutes: int) -> str:
    safe_name = escape(candidate_name or "there")
    safe_role = escape(role_title or "your interview")
    safe_company = escape(company_name or "")
    company_line = f" with {safe_company}" if safe_company else ""
    return f"""
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#1a1a1a">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5dccd;padding:32px">
      <p style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a5e;margin:0 0 4px">Basanite</p>
      <h1 style="font-size:22px;margin:0 0 12px">You're invited to interview for {safe_role}</h1>
      <p style="font-size:15px;line-height:1.55;color:#333;margin:0 0 16px">
        Hi {safe_name}, your application{company_line} has been received and we'd like to invite you to a short conversational interview.
      </p>
      <p style="font-size:15px;line-height:1.55;color:#333;margin:0 0 24px">
        It takes about {duration_minutes} minutes. You'll talk to an AI interviewer about your real experience, no scripted questions.
        Use a quiet space and a working microphone.
      </p>
      <p style="margin:0 0 32px">
        <a href="{escape(invite_url)}" style="display:inline-block;background:#1a1a1a;color:#f6f3ee;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:6px">Start your interview</a>
      </p>
      <p style="font-size:13px;color:#666;margin:0 0 8px">Or copy this link:</p>
      <p style="font-size:12px;color:#888;word-break:break-all;margin:0 0 24px">{escape(invite_url)}</p>
      <p style="font-size:12px;color:#8a7a5e;margin-top:32px;border-top:1px solid #eee;padding-top:16px">
        This link is unique to you — please don&rsquo;t share it.
      </p>
      <p style="font-size:11px;color:#8a7a5e;margin:8px 0 0">
        We&rsquo;ll record your interview, transcribe it, and use AI to score it. You&rsquo;ll see and confirm this on the consent screen before anything is recorded. You can decline at any time and your application stays with the hirer.
      </p>
      {_LEGAL_FOOTER_HTML}
    </div>
  </body>
</html>
""".strip()


def send_invite_email(
    *,
    to: str,
    candidate_name: str,
    role_title: str,
    company_name: str | None,
    invite_url: str,
    duration_minutes: int = 30,
) -> bool:
    """Send the candidate their unique interview invite link.
    Returns True on Resend success, False on any failure (logged)."""
    api_key = os.getenv("RESEND_API_KEY", "")
    sender = os.getenv("RESEND_FROM", "Basanite <onboarding@resend.dev>")
    if not api_key:
        print("  [email/invite] skipped (RESEND_API_KEY missing)")
        return False
    if not to or not _EMAIL_RE.match(to):
        print("  [email/invite] skipped (recipient missing or malformed)")
        return False
    if any(s in sender for s in _SANDBOX_SENDERS):
        print(
            "  [email/invite] WARNING: using Resend sandbox sender; "
            "deliveries to anyone other than the Resend account email will fail."
        )
    safe_role = _strip_header(role_title)[:140] or "interview"
    try:
        import resend
        resend.api_key = api_key
        resp = resend.Emails.send({
            "from": sender,
            "to": [to],
            "subject": f"Your interview invite, {safe_role}",
            "html": _render_invite_html(candidate_name, safe_role, company_name, invite_url, duration_minutes),
        })
        msg_id = (resp or {}).get("id") if isinstance(resp, dict) else None
        if msg_id:
            print(f"  [email/invite] sent (resend id={msg_id})")
            return True
        print(f"  [email/invite] send returned no id; payload type={type(resp).__name__}")
        return False
    except Exception as e:
        from core.log_safe import scrub
        print(f"  [email/invite] send failed: {type(e).__name__}: {scrub(str(e))}")
        return False


# ─── Org invitation (organisations rollout) ────────────────────────────────

def send_org_invitation_email(
    *,
    to: str,
    org_name: str,
    inviter_name: str | None,
    accept_url: str,
) -> bool:
    """Email the invitee a one-click 'Accept invitation' link. The token
    in the URL is the only auth — they're matched against `email` at the
    moment of acceptance."""
    api_key = os.getenv("RESEND_API_KEY", "")
    sender = os.getenv("RESEND_FROM", "Basanite <onboarding@resend.dev>")
    if not api_key:
        print("  [email/org-invite] skipped (RESEND_API_KEY missing)")
        return False
    if not to or not _EMAIL_RE.match(to):
        print("  [email/org-invite] skipped (recipient malformed)")
        return False
    if any(s in sender for s in _SANDBOX_SENDERS):
        print(
            "  [email/org-invite] WARNING: using Resend sandbox sender; "
            "deliveries to anyone other than the Resend account email will fail."
        )
    inviter = (inviter_name or "Your teammate").strip()[:80] or "Your teammate"
    safe_org = _strip_header(org_name)[:140] or "their team"
    safe_url = escape(accept_url)
    html = f"""
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#1a1a1a">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5dccd;padding:32px">
      <p style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a5e;margin:0 0 4px">Basanite</p>
      <h1 style="font-size:20px;margin:0 0 12px">{escape(inviter)} invited you to {escape(safe_org)}</h1>
      <p style="font-size:14px;line-height:1.55;color:#333;margin:0 0 16px">
        Joining gives you access to {escape(safe_org)}&rsquo;s shared roles, candidate pipelines, cloned interviewer voices, and ATS connections on Basanite.
      </p>
      <p style="margin:24px 0">
        <a href="{safe_url}" style="display:inline-block;background:#1a1a1a;color:#f6f3ee;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:6px">Accept invitation</a>
      </p>
      <p style="font-size:12px;color:#666;margin:0">
        Or copy this link: <a href="{safe_url}" style="color:#666">{safe_url}</a>
      </p>
      <p style="font-size:12px;color:#888;margin:16px 0 0">
        The invitation expires in 14 days. If you didn&rsquo;t expect this, ignore this email — nothing happens until you click the link.
      </p>
      {_LEGAL_FOOTER_HTML}
    </div>
  </body>
</html>
""".strip()
    try:
        import resend
        resend.api_key = api_key
        resend.Emails.send({
            "from": sender,
            "to": [to],
            "subject": f"You're invited to {safe_org} on Basanite",
            "html": html,
        })
        return True
    except Exception as e:
        from core.log_safe import scrub
        print(f"  [email/org-invite] failed: {type(e).__name__}: {scrub(str(e))}")
        return False


# ─── Founder ops alert (PR5/PR7) ───────────────────────────────────────────

def send_dsar_verification_email(*, to: str, request_type: str, verify_url: str) -> bool:
    """Send a one-time verification link for a Data Subject Access Request.
    Body is intentionally minimal so it doesn't leak details to anyone who
    intercepts the email — they confirm intent by clicking, then see the
    full status page on basanite.co.uk."""
    api_key = os.getenv("RESEND_API_KEY", "")
    sender = os.getenv("RESEND_FROM", "Basanite <onboarding@resend.dev>")
    if not api_key:
        print("  [email/dsar] skipped (RESEND_API_KEY missing)")
        return False
    if not to or not _EMAIL_RE.match(to):
        print("  [email/dsar] skipped (recipient malformed)")
        return False

    pretty = {
        "export": "data export",
        "erasure": "data deletion",
        "rectification": "data correction",
        "objection": "objection to automated decisions",
        "restriction": "processing restriction",
    }.get(request_type, "data request")

    safe_url = escape(verify_url)
    html = f"""
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#1a1a1a">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5dccd;padding:32px">
      <p style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a5e;margin:0 0 4px">Basanite</p>
      <h1 style="font-size:20px;margin:0 0 12px">Confirm your {escape(pretty)} request</h1>
      <p style="font-size:14px;line-height:1.55;color:#333;margin:0 0 16px">
        Someone (hopefully you) submitted a {escape(pretty)} request from this email. Click the button below to confirm — the link is valid for 24 hours and can only be used once.
      </p>
      <p style="margin:24px 0">
        <a href="{safe_url}" style="display:inline-block;background:#1a1a1a;color:#f6f3ee;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:6px">Confirm request</a>
      </p>
      <p style="font-size:12px;color:#666;margin:0">
        If you didn&rsquo;t make this request, ignore this email — nothing happens until you click the link.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="font-size:11px;color:#8a7a5e;margin:0">
        Privacy queries: privacy@basanite.co.uk
      </p>
    </div>
  </body>
</html>
""".strip()
    try:
        import resend
        resend.api_key = api_key
        resend.Emails.send({
            "from": sender,
            "to": [to],
            "subject": f"Confirm your Basanite {pretty} request",
            "html": html,
        })
        return True
    except Exception as e:
        from core.log_safe import scrub
        print(f"  [email/dsar] failed: {type(e).__name__}: {scrub(str(e))}")
        return False


def send_ops_alert(subject: str, body: str) -> bool:
    """Send a plaintext alert to the founder on critical ATS sync failures.
    OPS_ALERT_TO env controls recipient; falls back to RESEND_FROM mailbox."""
    api_key = os.getenv("RESEND_API_KEY", "")
    sender = os.getenv("RESEND_FROM", "Basanite <onboarding@resend.dev>")
    to = os.getenv("OPS_ALERT_TO", "andrew.robertson@basanite.co.uk")
    if not api_key or not to:
        print("  [email/ops] skipped (RESEND_API_KEY or OPS_ALERT_TO missing)")
        return False
    try:
        import resend
        resend.api_key = api_key
        safe_subject = _strip_header(subject)[:160] or "Basanite ATS alert"
        html = (
            "<pre style='font-family:ui-monospace,Menlo,monospace;"
            "font-size:13px;white-space:pre-wrap'>"
            f"{escape(body)}</pre>"
        )
        resend.Emails.send({
            "from": sender,
            "to": [to],
            "subject": f"[Basanite ATS] {safe_subject}",
            "html": html,
        })
        return True
    except Exception as e:
        print(f"  [email/ops] send failed: {type(e).__name__}: {e}")
        return False
