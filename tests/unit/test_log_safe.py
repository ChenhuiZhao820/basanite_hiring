"""Tests for core.log_safe — PII scrubbing for logs."""

import pytest

from core.log_safe import scrub


class TestScrubReturnsEmpty:
    def test_none_returns_empty(self):
        assert scrub(None) == ""

    def test_empty_string_returns_empty(self):
        assert scrub("") == ""

    def test_whitespace_passes_through(self):
        assert scrub("   ") == "   "


class TestScrubEmail:
    @pytest.mark.parametrize("email", [
        "alice@example.com",
        "alice.bond+work@example.co.uk",
        "a.b-c_d@example.org",
    ])
    def test_replaces_email_with_placeholder(self, email):
        out = scrub(f"contact: {email} please")
        assert email not in out
        assert "<email>" in out

    def test_replaces_multiple_emails(self):
        s = "from a@x.com to b@y.org cc c@z.net"
        out = scrub(s)
        assert "a@x.com" not in out
        assert "b@y.org" not in out
        assert "c@z.net" not in out
        assert out.count("<email>") == 3


class TestScrubPhone:
    @pytest.mark.parametrize("phone", [
        "+44 7700 900123",
        "+1 415 555 0199",
        "020 7946 0958",
        "+1-415-555-0199",
    ])
    def test_replaces_phone_with_placeholder(self, phone):
        out = scrub(f"call {phone}")
        assert "<phone>" in out

    def test_short_number_left_alone(self):
        # 911 is too short to match the loose regex.
        out = scrub("dial 911")
        assert "911" in out


class TestScrubBearer:
    def test_redacts_authorization_bearer(self):
        out = scrub("Authorization: Bearer abc123secrettoken")
        assert "abc123secrettoken" not in out
        assert "<redacted>" in out

    def test_redacts_case_insensitive(self):
        out = scrub("authorization: bearer xyz999")
        assert "xyz999" not in out
        assert "<redacted>" in out


class TestScrubApiKey:
    @pytest.mark.parametrize("key", [
        "sk-abc123def456",
        "pk_live_abcdef123456",
        "re_abc123key456",
        "ATIA1234567890ABCDEF",
    ])
    def test_replaces_api_key(self, key):
        out = scrub(f"key={key}")
        assert key not in out
        assert "<api_key>" in out


class TestScrubNiNumber:
    def test_replaces_uk_ni_number(self):
        out = scrub("NI: AB123456C is the candidate's number")
        assert "AB123456C" not in out
        assert "<ni_number>" in out


class TestScrubTruncation:
    def test_truncates_to_max_len(self):
        long = "a" * 500
        out = scrub(long, max_len=100)
        assert len(out) == 100
        assert out.endswith("…")

    def test_no_truncation_under_limit(self):
        out = scrub("short string", max_len=240)
        assert out == "short string"

    def test_default_max_len_is_240(self):
        out = scrub("a" * 500)
        assert len(out) == 240


class TestScrubCombined:
    def test_handles_multiple_pii_categories(self):
        msg = "Authorization: Bearer xyz; user a@b.com; phone +44 7700 900123"
        out = scrub(msg)
        assert "xyz" not in out
        assert "a@b.com" not in out
        assert "+44 7700 900123" not in out
        assert "<redacted>" in out
        assert "<email>" in out
        assert "<phone>" in out
