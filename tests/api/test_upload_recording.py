"""ENG-27: /assess/{token}/upload-recording must validate the file content
is actually a WebM recording before storing it. Without this, a candidate
could upload arbitrary binary content (malware, exfil, illegal media)
under the assessment's storage prefix.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def upload_client(monkeypatch):
    """TestClient with the assessment-loader stubbed so we exercise only
    the content-validation layer in /upload-recording."""
    import api
    from core import db as core_db
    monkeypatch.setattr(api, "_PIPELINE_SECRET", "test-pipeline-secret")

    class _StubResp:
        path = "x"

    class _StubBucket:
        def upload(self, *a, **k):
            return _StubResp()

    class _StubStorage:
        def from_(self, name):
            return _StubBucket()

    class _StubClient:
        storage = _StubStorage()
        def table(self, *a, **k):
            raise RuntimeError("table() should not be reached on validation-failure path")

    monkeypatch.setattr(core_db, "get_client", lambda: _StubClient())
    monkeypatch.setattr(
        core_db, "get_role_by_token",
        lambda token: {"id": "r1", "interview_duration_minutes": 20, "dimensions": []},
    )
    monkeypatch.setattr(
        core_db, "get_assessment",
        lambda aid: {"id": aid, "role_id": "r1", "cv_extracted": "{}"},
    )
    return TestClient(api.app)


_WEBM_MAGIC = b"\x1a\x45\xdf\xa3"


class TestUploadRecordingContentValidation:
    def test_rejects_non_webm_file(self, upload_client):
        # PNG header instead of WebM EBML magic.
        png = b"\x89PNG\r\n\x1a\n" + (b"x" * 5000)
        r = upload_client.post(
            "/assess/tok/upload-recording",
            data={"assessment_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"},
            files={"file": ("session.webm", png, "video/webm")},
        )
        assert r.status_code == 400
        assert "WebM" in r.json().get("detail", "") or "Unsupported" in r.json().get("detail", "")

    def test_rejects_empty_upload(self, upload_client):
        r = upload_client.post(
            "/assess/tok/upload-recording",
            data={"assessment_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"},
            files={"file": ("session.webm", b"", "video/webm")},
        )
        assert r.status_code == 400

    def test_rejects_tiny_file_under_min_size(self, upload_client):
        # WebM magic + 10 bytes — too small to be a real recording.
        tiny = _WEBM_MAGIC + b"x" * 10
        r = upload_client.post(
            "/assess/tok/upload-recording",
            data={"assessment_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"},
            files={"file": ("session.webm", tiny, "video/webm")},
        )
        assert r.status_code == 400
        assert "small" in r.json().get("detail", "").lower()

    def test_accepts_valid_webm(self, upload_client):
        # Magic bytes + enough trailing content to clear the min-size bar.
        webm = _WEBM_MAGIC + b"\x00" * 4096
        r = upload_client.post(
            "/assess/tok/upload-recording",
            data={"assessment_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"},
            files={"file": ("session.webm", webm, "video/webm")},
        )
        # Storage stub returns a path, so this should succeed.
        assert r.status_code == 200
        assert "recording_path" in r.json()

    def test_rejects_executable_disguised_as_webm(self, upload_client):
        # ELF binary header, not WebM. Filename and Content-Type are
        # client-controlled and shouldn't pass validation alone.
        elf = b"\x7fELF\x02\x01\x01\x00" + (b"\x00" * 5000)
        r = upload_client.post(
            "/assess/tok/upload-recording",
            data={"assessment_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"},
            files={"file": ("session.webm", elf, "video/webm")},
        )
        assert r.status_code == 400

    def test_rejects_zip_disguised_as_webm(self, upload_client):
        # ZIP magic 'PK\x03\x04'.
        zipfile = b"PK\x03\x04" + (b"x" * 5000)
        r = upload_client.post(
            "/assess/tok/upload-recording",
            data={"assessment_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"},
            files={"file": ("session.webm", zipfile, "video/webm")},
        )
        assert r.status_code == 400
