"""Tests for core.ats webhook signature + public-report URL signing."""

import hmac
import time
from hashlib import sha256

import pytest

from core.ats import (
    sign_public_report_url, verify_public_report_url, verify_webhook_signature,
)


class TestVerifyWebhookSignature:
    def _sign(self, body: bytes, secret: str) -> str:
        return hmac.new(secret.encode(), body, sha256).hexdigest()

    def test_valid_signature_passes(self, monkeypatch):
        monkeypatch.setenv("MERGE_WEBHOOK_SECRET", "shhh")
        body = b'{"event":"x"}'
        sig = self._sign(body, "shhh")
        assert verify_webhook_signature(body, sig) is True

    def test_signature_with_whitespace_stripped(self, monkeypatch):
        monkeypatch.setenv("MERGE_WEBHOOK_SECRET", "shhh")
        body = b'{}'
        sig = self._sign(body, "shhh")
        assert verify_webhook_signature(body, f"  {sig}  ") is True

    def test_invalid_signature_rejected(self, monkeypatch):
        monkeypatch.setenv("MERGE_WEBHOOK_SECRET", "shhh")
        assert verify_webhook_signature(b"{}", "bogus") is False

    def test_wrong_secret_rejected(self, monkeypatch):
        monkeypatch.setenv("MERGE_WEBHOOK_SECRET", "shhh")
        body = b"{}"
        sig = self._sign(body, "different-secret")
        assert verify_webhook_signature(body, sig) is False

    def test_no_secret_rejects(self, monkeypatch):
        monkeypatch.setenv("MERGE_WEBHOOK_SECRET", "")
        assert verify_webhook_signature(b"{}", "anything") is False

    def test_empty_header_rejected(self, monkeypatch):
        monkeypatch.setenv("MERGE_WEBHOOK_SECRET", "shhh")
        assert verify_webhook_signature(b"{}", "") is False


class TestSignPublicReportUrl:
    def test_returns_token_with_dot(self, monkeypatch):
        monkeypatch.setenv("PUBLIC_REPORT_SIGNING_KEY", "k")
        token = sign_public_report_url("aid", 999)
        assert "." in token
        assert token.startswith("999.")

    def test_missing_key_raises(self, monkeypatch):
        monkeypatch.setenv("PUBLIC_REPORT_SIGNING_KEY", "")
        with pytest.raises(RuntimeError, match="PUBLIC_REPORT_SIGNING_KEY"):
            sign_public_report_url("aid", 0)

    def test_different_assessments_produce_different_sigs(self, monkeypatch):
        monkeypatch.setenv("PUBLIC_REPORT_SIGNING_KEY", "k")
        a = sign_public_report_url("a1", 1000)
        b = sign_public_report_url("a2", 1000)
        assert a.split(".", 1)[1] != b.split(".", 1)[1]


class TestVerifyPublicReportUrl:
    def test_round_trip(self, monkeypatch):
        monkeypatch.setenv("PUBLIC_REPORT_SIGNING_KEY", "k")
        future = int(time.time()) + 3600
        token = sign_public_report_url("aid", future)
        assert verify_public_report_url("aid", token) is True

    def test_expired_token_rejected(self, monkeypatch):
        monkeypatch.setenv("PUBLIC_REPORT_SIGNING_KEY", "k")
        past = int(time.time()) - 60
        token = sign_public_report_url("aid", past)
        assert verify_public_report_url("aid", token) is False

    def test_tampered_assessment_id_rejected(self, monkeypatch):
        monkeypatch.setenv("PUBLIC_REPORT_SIGNING_KEY", "k")
        future = int(time.time()) + 3600
        token = sign_public_report_url("aid", future)
        assert verify_public_report_url("OTHER", token) is False

    def test_malformed_token_rejected(self, monkeypatch):
        monkeypatch.setenv("PUBLIC_REPORT_SIGNING_KEY", "k")
        assert verify_public_report_url("aid", "not-a-token") is False
        assert verify_public_report_url("aid", "abc.def") is False  # non-int expires

    def test_missing_key_rejects(self, monkeypatch):
        monkeypatch.setenv("PUBLIC_REPORT_SIGNING_KEY", "")
        assert verify_public_report_url("aid", "100.deadbeef") is False
