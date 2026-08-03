"""/assess/{token}/cv-upload must accept any genuine PDF (identified by the
%PDF magic bytes) regardless of the browser/OS-reported Content-Type or
filename, which are unreliable in the wild (application/octet-stream, blank
types, missing extensions all occur for real PDFs). The previous gate ANDed
in a strict Content-Type whitelist and rejected legitimate CVs with a 415.
Non-PDF content is still rejected.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def cv_client(monkeypatch):
    """TestClient with the role lookup, PDF extractor, and content
    classifier stubbed so we exercise only the upload gate, not Supabase,
    pypdf, or the LLM."""
    import api
    from agents import cv_validate as cv_mod
    from core import db as core_db
    from core import pdf as core_pdf

    monkeypatch.setattr(
        core_db, "get_role_by_token",
        lambda token: {"id": "r1", "status": "live"},
    )
    # Return comfortably more than the 80-char minimum so a passing gate
    # reaches a 200, isolating the content-type behaviour under test.
    monkeypatch.setattr(core_pdf, "extract_pdf_text", lambda data, **k: "x" * 500)

    # The content gate is covered by test_cv_upload_validation.py; stub it
    # to a clean verdict here (the "x"*500 stand-in text would otherwise
    # trip the gibberish prefilter).
    async def _clean(text):
        return {
            "document_type": "cv_or_resume", "is_cv": True,
            "confidence": "high", "injection_risk": "none",
            "harmful_content": "none", "regex_markers": [], "cv_likeness": 0.9,
        }
    monkeypatch.setattr(cv_mod, "validate_cv", _clean)
    return TestClient(api.app)


_PDF_MAGIC = b"%PDF-1.7\n"


class TestCvUploadGate:
    def test_accepts_pdf_with_octet_stream_content_type(self, cv_client):
        # The regression: a real PDF whose browser-reported type is
        # application/octet-stream used to be rejected with 415.
        pdf = _PDF_MAGIC + b"x" * 1000
        r = cv_client.post(
            "/assess/tok/cv-upload",
            files={"file": ("cv.pdf", pdf, "application/octet-stream")},
        )
        assert r.status_code == 200, r.text
        assert r.json()["cv_text"]

    def test_accepts_pdf_with_no_extension_or_type(self, cv_client):
        pdf = _PDF_MAGIC + b"x" * 1000
        r = cv_client.post(
            "/assess/tok/cv-upload",
            files={"file": ("resume", pdf, "")},
        )
        assert r.status_code == 200, r.text

    def test_accepts_standard_pdf(self, cv_client):
        pdf = _PDF_MAGIC + b"x" * 1000
        r = cv_client.post(
            "/assess/tok/cv-upload",
            files={"file": ("cv.pdf", pdf, "application/pdf")},
        )
        assert r.status_code == 200, r.text

    def test_rejects_non_pdf_even_with_pdf_content_type(self, cv_client):
        # A PNG mislabelled as a PDF must still be rejected — magic bytes
        # are authoritative, the client-supplied Content-Type is not.
        png = b"\x89PNG\r\n\x1a\n" + b"x" * 1000
        r = cv_client.post(
            "/assess/tok/cv-upload",
            files={"file": ("cv.pdf", png, "application/pdf")},
        )
        assert r.status_code == 415

    def test_rejects_empty_file(self, cv_client):
        r = cv_client.post(
            "/assess/tok/cv-upload",
            files={"file": ("cv.pdf", b"", "application/pdf")},
        )
        assert r.status_code == 400
