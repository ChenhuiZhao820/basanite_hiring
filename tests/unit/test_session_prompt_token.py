"""Tests for ENG-31's session prompt-token signing.

The token replaces the system-prompt-on-the-browser flow: the candidate's
browser only ever sees an opaque `<assessment_id>:<expires>:<sig>` blob,
and the ElevenLabs Conversation Initiation Webhook resolves it to a
freshly-assembled prompt server-side.

These tests exercise the signing/verifying pair in isolation.
"""

import time

import pytest


@pytest.fixture(autouse=True)
def _set_secret(monkeypatch):
    """Both helpers fail closed when the env var is unset; pin a value
    for the duration of each test and reset module-level cache."""
    monkeypatch.setenv("INTERVIEW_SESSION_SECRET", "test-secret-32-bytes-of-entropy!")
    # Re-import to pick up the env value at module load time.
    import importlib
    import api
    importlib.reload(api)
    return api


class TestMintAndVerify:
    def test_round_trip_returns_assessment_id(self, _set_secret):
        api = _set_secret
        token = api._mint_session_prompt_token("assess-123")
        assert api._verify_session_prompt_token(token) == "assess-123"

    def test_token_format_three_colon_segments(self, _set_secret):
        api = _set_secret
        token = api._mint_session_prompt_token("assess-123")
        # `<assessment_id>:<expires>:<hex_hmac>` — exactly two colons.
        assert token.count(":") == 2

    def test_tampered_assessment_id_rejected(self, _set_secret):
        api = _set_secret
        token = api._mint_session_prompt_token("assess-123")
        aid, exp, sig = token.rsplit(":", 2)
        forged = f"assess-456:{exp}:{sig}"
        assert api._verify_session_prompt_token(forged) is None

    def test_tampered_signature_rejected(self, _set_secret):
        api = _set_secret
        token = api._mint_session_prompt_token("assess-123")
        aid, exp, sig = token.rsplit(":", 2)
        # Flip one hex char.
        flipped = "0" if sig[0] != "0" else "1"
        forged = f"{aid}:{exp}:{flipped}{sig[1:]}"
        assert api._verify_session_prompt_token(forged) is None

    def test_expired_token_rejected(self, _set_secret):
        api = _set_secret
        # TTL of -1 second produces an already-expired token.
        token = api._mint_session_prompt_token("assess-123", ttl_seconds=-1)
        assert api._verify_session_prompt_token(token) is None

    def test_malformed_token_rejected(self, _set_secret):
        api = _set_secret
        for bad in ["", "not-a-token", "only:two", "a:b:c:d:e"]:
            assert api._verify_session_prompt_token(bad) is None

    def test_wrong_secret_rejected(self, _set_secret, monkeypatch):
        api = _set_secret
        token = api._mint_session_prompt_token("assess-123")
        # Rotate the secret out from under the verifier.
        monkeypatch.setenv("INTERVIEW_SESSION_SECRET", "different-secret")
        import importlib
        importlib.reload(api)
        assert api._verify_session_prompt_token(token) is None

    def test_missing_secret_returns_none_on_verify(self, _set_secret, monkeypatch):
        api = _set_secret
        token = api._mint_session_prompt_token("assess-123")
        monkeypatch.delenv("INTERVIEW_SESSION_SECRET", raising=False)
        import importlib
        importlib.reload(api)
        assert api._verify_session_prompt_token(token) is None
