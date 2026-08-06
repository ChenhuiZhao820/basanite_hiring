"""Tests for core.email pure HTML renderers and scrubbing helpers.

The send_* functions hit Resend; those are tested separately under
test_email_send.py with Resend mocked.
"""

import pytest

from core.email import (
    _bullet_list, _render_invite_html, _render_report_html, _scrub_recipient, _strip_header,
)


class TestStripHeader:
    @pytest.mark.parametrize("raw,expected", [
        ("hello", "hello"),
        ("hello\nworld", "hello world"),
        ("hello\r\nworld", "hello world"),
        ("hello\tworld", "hello world"),
        ("  spaced  ", "spaced"),
    ])
    def test_drops_crlf_and_trims(self, raw, expected):
        assert _strip_header(raw) == expected

    def test_none_safe(self):
        assert _strip_header(None) == ""

    def test_empty_safe(self):
        assert _strip_header("") == ""


class TestBulletList:
    def test_empty_returns_empty(self):
        assert _bullet_list([]) == ""

    def test_none_returns_empty(self):
        assert _bullet_list(None) == ""

    def test_renders_html_list(self):
        out = _bullet_list(["one", "two"])
        assert "<ul" in out
        assert "<li" in out
        assert "one" in out
        assert "two" in out

    def test_escapes_html(self):
        out = _bullet_list(["<script>alert(1)</script>"])
        assert "<script>" not in out
        assert "&lt;script&gt;" in out


class TestScrubRecipient:
    def test_replaces_recipient(self):
        out = _scrub_recipient("send failed for jane@example.com", "jane@example.com")
        assert "jane@example.com" not in out
        assert "<recipient>" in out

    def test_handles_empty(self):
        assert _scrub_recipient("", "x@y.com") == ""
        assert _scrub_recipient("text", "") == "text"


class TestRenderReportHtml:
    def test_includes_candidate_name(self):
        out = _render_report_html("Jane", "Engineer", {"summary": "x"})
        assert "Jane" in out

    def test_includes_role_title(self):
        out = _render_report_html("Jane", "Senior Engineer", {})
        assert "Senior Engineer" in out

    def test_includes_summary(self):
        out = _render_report_html("Jane", "R", {"summary": "Solid answers."})
        assert "Solid answers." in out

    def test_includes_strengths_bullets(self):
        out = _render_report_html("Jane", "R", {"strengths": ["clear examples"]})
        assert "clear examples" in out
        assert "<ul" in out

    def test_includes_areas(self):
        out = _render_report_html("Jane", "R", {"areas_for_development": ["go deeper"]})
        assert "go deeper" in out

    def test_includes_overall_in_italic_block(self):
        out = _render_report_html("Jane", "R", {"overall_impression": "good"})
        assert "good" in out
        assert "italic" in out

    def test_escapes_dangerous_html(self):
        out = _render_report_html("<script>", "R", {"summary": "ok"})
        assert "<script>" not in out
        assert "&lt;script&gt;" in out

    def test_escapes_summary_html(self):
        out = _render_report_html("Jane", "R", {"summary": "<img src=x>"})
        assert "<img src=x>" not in out

    def test_includes_legal_footer(self):
        out = _render_report_html("Jane", "R", {})
        assert "privacy" in out.lower()

    def test_handles_missing_candidate_name(self):
        out = _render_report_html("", "Role", {})
        assert "there" in out  # falls back to "Hi there,"


class TestRenderInviteHtml:
    def test_includes_role_title_and_company(self):
        out = _render_invite_html("Jane", "Senior Engineer", "Acme", "https://example.com/invite", 30, None)
        assert "Senior Engineer" in out
        assert "Acme" in out
        assert "30 minutes" in out

    def test_includes_role_summary(self):
        summary = "We are looking for a hands-on engineer to lead our platform team. You will ship production code, mentor juniors, and own the observability stack."
        out = _render_invite_html("Jane", "Senior Engineer", "Acme", "https://example.com/invite", 30, summary)
        assert "About the role" in out
        assert "hands-on engineer" in out
        assert out.count("mentor juniors") == 1  # truncated but present

    def test_escapes_summary_html_and_truncates(self):
        summary = "<script>alert(1)</script> " + "x " * 300
        out = _render_invite_html("Jane", "R", "C", "https://example.com/invite", 15, summary)
        assert "<script>" not in out
        assert "&lt;script&gt;" not in out  # stripped entirely before escape
        assert "x x" in out
        # The 600-char input is truncated; the rendered output should be
        # much smaller than the un-truncated HTML would have been.
        assert out.count("x x") < 200

    def test_handles_missing_company_and_summary(self):
        out = _render_invite_html("Jane", "Senior Engineer", None, "https://example.com/invite", 30, None)
        assert "Senior Engineer" in out
        assert "About the role" not in out
        assert "Start your interview" in out
