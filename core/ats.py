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


# ─────────────────────────── Inbound CV attachment fetch (PR5) ──────────────


def fetch_candidate_cv_text(account_token: str, merge_candidate_id: str) -> str | None:
    """
    Fetch the most recent resume/CV attachment for a Merge candidate and
    extract plaintext from it. Returns None if the candidate has no resume
    or extraction fails.

    Merge exposes attachments as URLs the SDK can download for us. We try
    each attachment marked `attachment_type == "RESUME"` newest-first, fall
    back to any PDF attachment, then give up.
    """
    try:
        client = merge_client(account_token=account_token)
        # Some SDK versions expose attachments via candidates retrieve, others
        # via attachments.list with candidate filter. Try the filtered list
        # which is unambiguous.
        attachments_resp = client.ats.attachments.list(
            candidate_id=merge_candidate_id,
            page_size=20,
        )
        items = list(getattr(attachments_resp, "results", None) or [])
    except Exception as e:
        print(f"  [ats] fetch attachments failed for {merge_candidate_id}: {type(e).__name__}: {e}")
        return None

    # Sort: RESUME first, then anything else. Within each, most recent first.
    def _is_resume(a) -> bool:
        kind = (getattr(a, "attachment_type", "") or "").upper()
        return kind == "RESUME"

    def _modified(a):
        return getattr(a, "modified_at", None) or getattr(a, "remote_created_at", None) or ""

    items.sort(key=lambda a: (0 if _is_resume(a) else 1, -1 * (hash(_modified(a)) & 0xffff)))

    for att in items:
        url = getattr(att, "file_url", None) or getattr(att, "url", None)
        if not url:
            continue
        text = _download_and_extract_pdf_text(url)
        if text and len(text) >= 80:
            return text
    return None


def _download_and_extract_pdf_text(url: str) -> str | None:
    """Download a remote file and extract text if it's a PDF."""
    try:
        import io
        import urllib.request

        with urllib.request.urlopen(url, timeout=20) as resp:  # noqa: S310 (Merge URLs are trusted)
            data = resp.read(10 * 1024 * 1024 + 1)  # 10MB cap
        if len(data) > 10 * 1024 * 1024:
            print(f"  [ats] attachment > 10MB; skipping")
            return None
        if data[:4] != b"%PDF":
            # Not a PDF — could be docx etc. Skip for v1.
            return None
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data))
        pages = []
        for page in reader.pages:
            try:
                pages.append(page.extract_text() or "")
            except Exception:
                continue
        return "\n\n".join(p.strip() for p in pages if p.strip()) or None
    except Exception as e:
        print(f"  [ats] download/extract failed: {type(e).__name__}: {e}")
        return None


# ─────────────────────────── Outbound results push (PR7) ────────────────────


def push_results(assessment_id: str) -> bool:
    """
    Post the assessment result to the customer's ATS via the right provider
    adapter. Idempotent in spirit — running twice posts two notes, so callers
    should gate via `assessments.last_push_status`.

    Behavior:
      1. Look up the assessment + its connection + the customer's org flags.
      2. If `org.feature_flags.ats_push_enabled` is not True, log a dry-run
         and stop. (Dark-launch gate for the first client.)
      3. Build AdapterContext from the saved hirer report and dimension
         scores. Sign a public-PDF URL valid for 90 days.
      4. Dispatch to the right provider adapter.
      5. Persist last_push_status / last_push_error on the assessment.
      6. Log structured failure to ats_sync_errors and email the founder.
    """
    import time
    import os
    from core import db
    from core.ats_adapters import AdapterContext, adapter_for

    assessment = db.get_assessment(assessment_id)
    if not assessment:
        print(f"  [ats/push] assessment {assessment_id} not found")
        return False

    if assessment.get("source") != "ats":
        # Self-serve assessments have no ATS to push to.
        return False

    connection_id = assessment.get("connection_id")
    merge_application_id = assessment.get("merge_application_id")
    if not connection_id or not merge_application_id:
        print(f"  [ats/push] missing connection_id / merge_application_id on {assessment_id}")
        return False

    connection = db.get_ats_connection(connection_id)
    if not connection or connection.get("status") != "connected":
        print(f"  [ats/push] connection {connection_id} not active")
        return False

    org_id = connection.get("org_id")
    flags = db.get_org_feature_flags(org_id) if org_id else {}
    push_enabled = bool(flags.get("ats_push_enabled"))

    if not push_enabled:
        print(
            f"  [ats/push] DRY-RUN (ats_push_enabled flag off) for org={org_id} "
            f"assessment={assessment_id}"
        )
        db.update_assessment(
            assessment_id,
            last_push_status="pending",
            last_push_error="ats_push_enabled flag is off (dry-run)",
            last_push_at="now()",
        )
        return False

    # Load report payloads.
    hirer_report = db.get_report(assessment_id, "hirer") or {}
    hirer_content = hirer_report.get("content") or {}
    if isinstance(hirer_content, str):
        try:
            import json as _json
            hirer_content = _json.loads(hirer_content)
        except Exception:
            hirer_content = {}

    # Dimension scores live in their own table.
    dim_scores: list[dict] = []
    overall_score = None
    try:
        from core.db import get_client
        client = get_client()
        if client:
            r = (
                client.table("dimension_scores")
                .select("dimension_key, score, evidence_summary")
                .eq("assessment_id", assessment_id)
                .execute()
            )
            dim_scores = r.data or []
            scored = [d.get("score") for d in dim_scores if d.get("score") is not None]
            if scored:
                overall_score = sum(float(s) for s in scored) / len(scored)
    except Exception as e:
        print(f"  [ats/push] failed to load dimension_scores: {e}")

    # Sign a public report URL good for 90 days.
    expires = int(time.time()) + 90 * 24 * 3600
    try:
        sig = sign_public_report_url(assessment_id, expires)
    except RuntimeError as e:
        print(f"  [ats/push] missing signing key: {e}")
        db.update_assessment(
            assessment_id,
            last_push_status="failed",
            last_push_error=str(e),
            last_push_at="now()",
        )
        return False

    public_base = os.getenv("PUBLIC_APP_URL", "https://basanite.co.uk").rstrip("/")
    public_report_url = (
        f"{public_base}/reports/public/{assessment_id}?token={sig}"
    )

    # Decrypt the linked-account token only at the moment of use.
    try:
        account_token = decrypt_token(connection["account_token_encrypted"])
    except Exception as e:
        msg = f"Failed to decrypt token: {type(e).__name__}: {e}"
        print(f"  [ats/push] {msg}")
        db.log_ats_sync_error(
            direction="outbound",
            operation="push_results",
            error_class=type(e).__name__,
            error_message=msg,
            org_id=org_id,
            connection_id=connection_id,
            assessment_id=assessment_id,
        )
        db.update_assessment(
            assessment_id,
            last_push_status="failed",
            last_push_error=msg[:1000],
            last_push_at="now()",
        )
        return False

    ctx = AdapterContext(
        assessment_id=assessment_id,
        merge_application_id=merge_application_id,
        merge_candidate_id=assessment.get("merge_candidate_id"),
        candidate_name=assessment.get("candidate_name") or "Candidate",
        role_title=hirer_content.get("role_title") or "interview",
        overall_score=overall_score,
        dimension_scores=dim_scores,
        summary_text=(hirer_content.get("summary") or "")[:1500],
        public_report_url=public_report_url,
    )

    provider = (connection.get("provider") or "").lower()
    adapter = adapter_for(provider)

    try:
        client = merge_client(account_token=account_token)
        result = adapter(client, ctx)
    except Exception as e:
        msg = f"adapter raised: {type(e).__name__}: {e}"
        db.log_ats_sync_error(
            direction="outbound",
            operation="push_results",
            error_class=type(e).__name__,
            error_message=msg,
            org_id=org_id,
            connection_id=connection_id,
            assessment_id=assessment_id,
            context={"provider": provider},
        )
        db.update_assessment(
            assessment_id,
            last_push_status="failed",
            last_push_error=msg[:1000],
            last_push_at="now()",
        )
        _alert_founder("push_results raised", f"assessment={assessment_id} provider={provider}\n{msg}")
        return False

    if not result.success:
        db.log_ats_sync_error(
            direction="outbound",
            operation="push_results",
            error_class="AdapterError",
            error_message=result.error or "unknown",
            org_id=org_id,
            connection_id=connection_id,
            assessment_id=assessment_id,
            context={"provider": provider, "kind": result.kind},
        )
        db.update_assessment(
            assessment_id,
            last_push_status="failed",
            last_push_error=(result.error or "unknown")[:1000],
            last_push_at="now()",
        )
        _alert_founder(
            "push_results failed",
            f"assessment={assessment_id} provider={provider} kind={result.kind}\n{result.error}",
        )
        return False

    db.update_assessment(
        assessment_id,
        last_push_status="success",
        last_push_error=None,
        last_push_at="now()",
    )
    print(f"  [ats/push] success kind={result.kind} provider={provider} assessment={assessment_id}")
    return True


def _alert_founder(subject: str, body: str) -> None:
    try:
        from core.email import send_ops_alert
        send_ops_alert(subject, body)
    except Exception as e:
        print(f"  [ats/alert] failed to send ops alert: {e}")
