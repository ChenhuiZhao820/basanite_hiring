"""Tests for core.ats — token AES-GCM encryption + key handling."""

import base64

import pytest

from core.ats import _aes_key, decrypt_token, encrypt_token


class TestAesKey:
    @pytest.mark.parametrize("nbytes", [16, 24, 32])
    def test_accepts_valid_key_sizes(self, nbytes, monkeypatch):
        monkeypatch.setenv("ATS_TOKEN_ENC_KEY", base64.urlsafe_b64encode(b"\x00" * nbytes).decode())
        out = _aes_key()
        assert len(out) == nbytes

    def test_rejects_wrong_size(self, monkeypatch):
        # 20 bytes is invalid for AES.
        monkeypatch.setenv("ATS_TOKEN_ENC_KEY", base64.urlsafe_b64encode(b"\x00" * 20).decode())
        with pytest.raises(RuntimeError, match="16/24/32"):
            _aes_key()

    def test_missing_env_raises(self, monkeypatch):
        monkeypatch.setenv("ATS_TOKEN_ENC_KEY", "")
        with pytest.raises(RuntimeError, match="ATS_TOKEN_ENC_KEY not configured"):
            _aes_key()


class TestEncryptDecrypt:
    def test_round_trip(self):
        secret = "merge-account-token-abc-123"
        ct = encrypt_token(secret)
        assert ct != secret
        assert decrypt_token(ct) == secret

    def test_unicode_round_trip(self):
        secret = "tøkén-with-üñîçødé-✓"
        assert decrypt_token(encrypt_token(secret)) == secret

    def test_empty_string_round_trip(self):
        assert decrypt_token(encrypt_token("")) == ""

    def test_nonce_is_random(self):
        # Two encryptions of the same plaintext must differ (random nonce).
        a = encrypt_token("same")
        b = encrypt_token("same")
        assert a != b

    def test_tampered_ciphertext_fails(self):
        ct = encrypt_token("hello")
        raw = base64.urlsafe_b64decode(ct.encode("ascii"))
        # Flip a byte well inside the ciphertext (past the 12-byte nonce).
        tampered_raw = raw[:15] + bytes([raw[15] ^ 0xFF]) + raw[16:]
        tampered = base64.urlsafe_b64encode(tampered_raw).decode("ascii")
        with pytest.raises(Exception):
            decrypt_token(tampered)

    def test_garbage_input_fails(self):
        with pytest.raises(Exception):
            decrypt_token("not-valid-base64-or-anything!!!!")
