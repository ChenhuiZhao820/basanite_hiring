"""
Log-safety helpers.

Render persists stdout for ~30 days and that log is visible to anyone with
dashboard access. Any PII that lands in print() is therefore retained
beyond our own retention windows. This module provides a single function
to scrub error/log messages of obvious PII before they're emitted.

Patterns scrubbed:
  - Email addresses
  - Phone numbers (loose: 7+ digits with optional separators)
  - UK National Insurance numbers
  - Authorization headers and bearer tokens
"""

from __future__ import annotations

import re

_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
# Conservative phone match: keeps UK + international shapes, ignores
# plain digits in URLs.
_PHONE_RE = re.compile(r"\+?\d[\d\s().-]{6,}\d")
# Bearer tokens / auth headers: redact the value half.
_BEARER_RE = re.compile(r"(?i)(authorization\s*[:=]\s*bearer\s+)\S+")
_API_KEY_RE = re.compile(r"(?i)(sk-[\w]{6,}|pk_[\w]{6,}|re_[\w]{6,}|ATIA[\w]{6,})")
# UK NI number e.g. AB123456C
_NI_RE = re.compile(r"\b[A-Z]{2}\d{6}[A-D]?\b")


def scrub(text: str | None, max_len: int = 240) -> str:
    """Return a copy of `text` with PII masked. Truncates to max_len chars."""
    if not text:
        return ""
    s = str(text)
    s = _EMAIL_RE.sub("<email>", s)
    s = _BEARER_RE.sub(r"\1<redacted>", s)
    s = _API_KEY_RE.sub("<api_key>", s)
    s = _PHONE_RE.sub("<phone>", s)
    s = _NI_RE.sub("<ni_number>", s)
    if len(s) > max_len:
        s = s[: max_len - 1] + "…"
    return s
