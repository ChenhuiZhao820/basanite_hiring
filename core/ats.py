"""
ATS (Applicant Tracking System) integration via Merge.dev Unified API.

This is the PR2 skeleton: client factory, token encryption helpers, and
function stubs that future PRs (PR3 connect, PR5 webhook intake, PR7 outbound
results) will fill in. No real ATS calls happen yet — importing this module
should be a no-op for the running pipeline.

Why this lives in `core/`:
    - The Merge SDK client + token encryption are shared between the FastAPI
      route handlers (api.py) and the report-generation flow (interview.py).
      Both reach into ats.* rather than duplicating SDK boilerplate.

Env vars consumed (set on the Render service running api.py):
    MERGE_API_KEY               Merge production API key (server-only).
    MERGE_ENV                   "production" or "sandbox". Defaults to "production".
    MERGE_WEBHOOK_SECRET        HMAC secret for verifying inbound Merge webhooks.
    ATS_TOKEN_ENC_KEY           32-byte URL-safe base64 key for AES-GCM
                                encryption of per-org linked-account tokens.
    PUBLIC_REPORT_SIGNING_KEY   HMAC secret for signing public report-PDF URLs
                                that we link from ATS notes.
"""

from __future__ import annotations

import base64
import hmac
import os
from dataclasses import dataclass
from hashlib import sha256
from typing import Optional

# We import lazily inside functions for the SDK + cryptography so a missing
# dependency at module import doesn't take down api.py during local dev.
# Once PR3 ships and the SDK is required in production, we can hoist these
# imports back to module level.

# ─────────────────────────── Config ───────────────────────────


@dataclass(frozen=True)
class AtsConfig:
    """Snapshot of the ATS-related env at import time. Read once, reuse."""

    merge_api_key_prod: str
    merge_api_key_test: str
    merge_env: str  # "production" | "test"
    merge_webhook_secret: str
    token_enc_key_b64: str
    public_report_signing_key: str

    @property
    def merge_api_key(self) -> str:
        """The Merge API key for the active environment.

        MERGE_ENV='test' picks MERGE_TEST_API_KEY (test linked-accounts only,
        with synthetic data); anything else (default 'production') picks
        MERGE_API_KEY. The whole app uses one or the other at a time so
        production keeps shipping with a single env-var flip.
        """
        if self.merge_env == "test":
            return self.merge_api_key_test
        return self.merge_api_key_prod

    @property
    def is_configured(self) -> bool:
        """True if the minimum env to call Merge is present."""
        return bool(self.merge_api_key and self.token_enc_key_b64)


def load_config() -> AtsConfig:
    return AtsConfig(
        merge_api_key_prod=os.getenv("MERGE_API_KEY", ""),
        merge_api_key_test=os.getenv("MERGE_TEST_API_KEY", ""),
        merge_env=os.getenv("MERGE_ENV", "production").lower(),
        merge_webhook_secret=os.getenv("MERGE_WEBHOOK_SECRET", ""),
        token_enc_key_b64=os.getenv("ATS_TOKEN_ENC_KEY", ""),
        public_report_signing_key=os.getenv("PUBLIC_REPORT_SIGNING_KEY", ""),
    )


# ─────────────────────────── Token encryption ───────────────────────────
# Merge gives us a per-linked-account token that is full read/write access to
# the customer's ATS. We never want it stored in plain text. AES-GCM with a
# server-side key is enough — rotation strategy is "issue a new key, re-encrypt
# rows in a backfill, retire the old key" (out of scope here).

_NONCE_BYTES = 12  # AES-GCM standard nonce size


def _aes_key() -> bytes:
    cfg = load_config()
    if not cfg.token_enc_key_b64:
        raise RuntimeError("ATS_TOKEN_ENC_KEY not configured")
    key = base64.urlsafe_b64decode(cfg.token_enc_key_b64)
    if len(key) not in (16, 24, 32):
        raise RuntimeError(
            f"ATS_TOKEN_ENC_KEY must decode to 16/24/32 bytes (got {len(key)})"
        )
    return key


def encrypt_token(plaintext: str) -> str:
    """
    Encrypt a Merge linked-account token. Returns base64(nonce || ciphertext)
    so we can store the result as a single TEXT column.
    """
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    key = _aes_key()
    aes = AESGCM(key)
    nonce = os.urandom(_NONCE_BYTES)
    ct = aes.encrypt(nonce, plaintext.encode("utf-8"), associated_data=None)
    return base64.urlsafe_b64encode(nonce + ct).decode("ascii")


def decrypt_token(encoded: str) -> str:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    key = _aes_key()
    blob = base64.urlsafe_b64decode(encoded.encode("ascii"))
    nonce, ct = blob[:_NONCE_BYTES], blob[_NONCE_BYTES:]
    aes = AESGCM(key)
    pt = aes.decrypt(nonce, ct, associated_data=None)
    return pt.decode("utf-8")


# ─────────────────────────── Merge SDK client ───────────────────────────


def merge_client(account_token: Optional[str] = None):
    """
    Return a Merge SDK client. With `account_token` set, calls are scoped to
    that linked account (a single hirer's ATS). Without it, you only have the
    Merge org-level API surface (link tokens, account fetch).

    Lazy import so the dependency is only required when this is actually
    called (avoids breaking dev without the SDK installed).
    """
    # The PyPI distribution is `MergePythonClient`; the importable module is
    # `merge.client` per Merge's official docs.
    from merge.client import Merge

    cfg = load_config()
    if not cfg.merge_api_key:
        # Make the failure mode obvious — distinguish "MERGE_TEST_API_KEY missing
        # in test env" from "MERGE_API_KEY missing in prod env".
        var_name = "MERGE_TEST_API_KEY" if cfg.merge_env == "test" else "MERGE_API_KEY"
        raise RuntimeError(f"{var_name} not configured (MERGE_ENV={cfg.merge_env!r})")
    return Merge(api_key=cfg.merge_api_key, account_token=account_token)


# ─────────────────────────── Webhook signature verification ───────────────────────────


def verify_webhook_signature(raw_body: bytes, header_signature: str) -> bool:
    """
    Verify the X-Merge-Webhook-Signature header against the raw request body
    using HMAC-SHA256 with MERGE_WEBHOOK_SECRET. Constant-time compare.
    """
    cfg = load_config()
    if not cfg.merge_webhook_secret or not header_signature:
        return False
    expected = hmac.new(
        cfg.merge_webhook_secret.encode("utf-8"),
        raw_body,
        sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, header_signature.strip())


# ─────────────────────────── Public-report PDF URL signer ───────────────────────────


def sign_public_report_url(assessment_id: str, expires_at_unix: int) -> str:
    """
    Build an HMAC token for a public report URL. Used in ATS notes so a
    reviewer can open the candidate's report PDF without a Basanite login.
    The verification side (PR7's `/reports/public/{token}` route) re-runs
    this same hash and compares.
    """
    cfg = load_config()
    if not cfg.public_report_signing_key:
        raise RuntimeError("PUBLIC_REPORT_SIGNING_KEY not configured")
    payload = f"{assessment_id}:{expires_at_unix}"
    sig = hmac.new(
        cfg.public_report_signing_key.encode("utf-8"),
        payload.encode("utf-8"),
        sha256,
    ).hexdigest()
    # token shape: <expires>.<sig>; the assessment_id is in the URL path itself
    return f"{expires_at_unix}.{sig}"


def verify_public_report_url(assessment_id: str, token: str) -> bool:
    cfg = load_config()
    if not cfg.public_report_signing_key:
        return False
    try:
        expires_str, sig = token.split(".", 1)
        expires_at = int(expires_str)
    except (ValueError, AttributeError):
        return False
    import time as _time

    if expires_at < int(_time.time()):
        return False
    expected = hmac.new(
        cfg.public_report_signing_key.encode("utf-8"),
        f"{assessment_id}:{expires_at}".encode("utf-8"),
        sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, sig)


# ─────────────────────────── Stubs for later PRs ───────────────────────────


def push_results(assessment_id: str) -> bool:
    """
    PR7 will implement this. Posts a structured note + score + signed report
    PDF link onto the candidate's ATS application. Returns True on success.

    For now this is a no-op so `interview.generate_reports` can call it without
    breaking; once PR7 lands the real implementation replaces this body.
    """
    # Intentionally a no-op until PR7. Logging here so absent results sync
    # is at least visible in Render logs.
    print(f"  [ats] push_results stub called for assessment {assessment_id}")
    return False
