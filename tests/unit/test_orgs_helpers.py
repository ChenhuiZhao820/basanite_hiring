"""Tests for core.orgs — email-domain helpers for the auto-join feature."""

import pytest

from core.orgs import extract_email_domain, is_free_email_domain, FREE_EMAIL_DOMAINS


class TestExtractEmailDomain:
    @pytest.mark.parametrize("email,expected", [
        ("alice@example.com", "example.com"),
        ("Alice@Example.COM", "example.com"),
        ("alice.bond+work@example.co.uk", "example.co.uk"),
        ("a@b", "b"),
    ])
    def test_extracts_lowercase_domain(self, email, expected):
        assert extract_email_domain(email) == expected

    def test_strips_whitespace(self):
        assert extract_email_domain("alice@  example.com  ") == "example.com"

    @pytest.mark.parametrize("bad", [None, "", "no-at-sign", "@", "alice@"])
    def test_returns_none_for_invalid(self, bad):
        assert extract_email_domain(bad) is None


class TestIsFreeEmailDomain:
    @pytest.mark.parametrize("inp", [
        "user@gmail.com",
        "USER@GMAIL.COM",
        "user@hotmail.com",
        "user@outlook.co.uk",
        "user@yahoo.com",
        "user@icloud.com",
        "user@protonmail.com",
    ])
    def test_blocks_known_free_emails(self, inp):
        assert is_free_email_domain(inp) is True

    @pytest.mark.parametrize("inp", [
        "gmail.com",
        "GMAIL.COM",
        "hotmail.com",
    ])
    def test_blocks_bare_domains(self, inp):
        assert is_free_email_domain(inp) is True

    @pytest.mark.parametrize("inp", [
        "user@maxwellbond.com",
        "user@anthropic.com",
        "user@basanite.co.uk",
    ])
    def test_allows_corporate_domains(self, inp):
        assert is_free_email_domain(inp) is False

    @pytest.mark.parametrize("bad", [None, "", "   "])
    def test_safely_handles_empty(self, bad):
        assert is_free_email_domain(bad) is False

    def test_blocklist_is_lowercase(self):
        # Sanity: the canonical blocklist must be lowercase so the lookup
        # path is consistent.
        for d in FREE_EMAIL_DOMAINS:
            assert d == d.lower()
