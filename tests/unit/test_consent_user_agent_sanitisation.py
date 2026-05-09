"""Tests for ENG-48: consent_user_agent sanitisation before DB persist.

The Pydantic 400-char cap on the API side is the first line of defence;
this is the second — strip ASCII control chars and HTML metacharacters
so a future admin UI that renders the field unescaped can't be turned
into a stored XSS surface.
"""

import pytest

from core.db import _sanitize_user_agent


class TestSanitizeUserAgent:
    def test_passes_normal_ua_through(self):
        ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15"
        assert _sanitize_user_agent(ua) == ua

    def test_returns_none_for_none(self):
        assert _sanitize_user_agent(None) is None

    def test_returns_none_for_empty(self):
        assert _sanitize_user_agent("") is None

    def test_returns_none_for_whitespace_only(self):
        assert _sanitize_user_agent("   \t\n  ") is None

    def test_strips_html_angle_brackets(self):
        out = _sanitize_user_agent("<script>alert(1)</script> Mozilla/5.0")
        assert "<" not in out
        assert ">" not in out
        assert "Mozilla/5.0" in out

    def test_strips_quotes(self):
        out = _sanitize_user_agent("UA \"with quotes\" and 'apostrophes' and `backticks`")
        assert '"' not in out
        assert "'" not in out
        assert "`" not in out

    def test_strips_control_chars(self):
        out = _sanitize_user_agent("UA\x00\x01\x1f\x7fwith\nnewline\rcr\ttab")
        assert "\x00" not in out
        assert "\x01" not in out
        assert "\x1f" not in out
        assert "\x7f" not in out
        assert "\n" not in out
        assert "\r" not in out
        assert "\t" not in out

    def test_truncates_to_400_chars(self):
        ua = "A" * 1000
        out = _sanitize_user_agent(ua)
        assert len(out) == 400

    def test_unicode_passes_through(self):
        # Non-ASCII isn't malicious by itself; some legitimate UAs
        # include language/region tags. Don't strip them.
        ua = "Mozilla/5.0 (中文 — naïve)"
        out = _sanitize_user_agent(ua)
        assert "中文" in out
        assert "naïve" in out
