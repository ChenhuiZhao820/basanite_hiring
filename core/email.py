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
        Keep this email, it's your personal copy of the report.
      </p>
    </div>
  </body>
</html>
""".strip()


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
        print("  [email] skipped (api_key missing)")
        return False
    if not to or not _EMAIL_RE.match(to):
        print("  [email] skipped (recipient missing or malformed)")
        return False

    safe_role = _strip_header(role_title)[:140] or "your interview"
    try:
        import resend
        resend.api_key = api_key
        resend.Emails.send({
            "from": sender,
            "to": [to],
            "subject": f"Your Basanite feedback, {safe_role}",
            "html": _render_report_html(candidate_name, safe_role, report),
        })
        return True
    except Exception as e:
        # Exception text may include the recipient address; drop to class name.
        print(f"  [email] send failed: {type(e).__name__}")
        return False
