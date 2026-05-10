"""Tests for ENG-60's hash_auth_token helper."""

import importlib

import pytest


@pytest.fixture
def hash_with_pepper(monkeypatch):
    monkeypatch.setenv("TOKEN_HASH_PEPPER", "test-pepper-32-bytes-of-entropy!!")
    from core import db as _db
    importlib.reload(_db)
    return _db.hash_auth_token


@pytest.fixture
def hash_without_pepper(monkeypatch):
    monkeypatch.delenv("TOKEN_HASH_PEPPER", raising=False)
    from core import db as _db
    importlib.reload(_db)
    return _db.hash_auth_token


class TestHashAuthToken:
    def test_round_trip_deterministic(self, hash_with_pepper):
        # Same input + pepper = same hash. Required for the verify
        # endpoint to find the row created at insert time.
        a = hash_with_pepper("token-abc")
        b = hash_with_pepper("token-abc")
        assert a == b
        assert len(a) == 64  # sha256 hex

    def test_different_tokens_different_hashes(self, hash_with_pepper):
        assert hash_with_pepper("token-abc") != hash_with_pepper("token-def")

    def test_pepper_changes_output(self, monkeypatch):
        from core import db as _db

        monkeypatch.setenv("TOKEN_HASH_PEPPER", "pepper-A")
        importlib.reload(_db)
        with_a = _db.hash_auth_token("token-abc")

        monkeypatch.setenv("TOKEN_HASH_PEPPER", "pepper-B")
        importlib.reload(_db)
        with_b = _db.hash_auth_token("token-abc")

        assert with_a != with_b

    def test_empty_token_does_not_crash(self, hash_with_pepper):
        # Defensive: lookup with an empty incoming token must produce a
        # consistent miss, not raise.
        assert isinstance(hash_with_pepper(""), str)
        assert len(hash_with_pepper("")) == 64

    def test_no_pepper_falls_back_to_plain_sha256(self, hash_without_pepper):
        # Dev / test environments without TOKEN_HASH_PEPPER still work,
        # just without the breach-mitigation property.
        import hashlib
        expected = hashlib.sha256(b"token-abc").hexdigest()
        assert hash_without_pepper("token-abc") == expected

    def test_unicode_token_is_utf8_encoded(self, hash_with_pepper):
        # base64url tokens are ASCII so this is belt-and-braces, but
        # the helper should never crash on non-ASCII input.
        assert isinstance(hash_with_pepper("tök😀en"), str)
