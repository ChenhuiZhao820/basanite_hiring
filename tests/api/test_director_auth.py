"""ENG-17: /assess/{token}/director must require the internal pipeline secret.

The Director endpoint runs the Opus 4.7 supervisor on the supplied transcript.
Without auth, anyone holding (or guessing) an assessment_link_token plus an
assessment_id can spam Opus calls or feed arbitrary content to the model.

These tests assert the endpoint rejects unauthenticated and wrongly-authorised
requests at the auth layer, before any DB lookup happens.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def director_client(monkeypatch):
    """A TestClient with a known PIPELINE_API_SECRET patched in.

    api.py reads the secret into a module-level _PIPELINE_SECRET at import
    time, so we patch the resolved value rather than the env var.
    """
    import api
    monkeypatch.setattr(api, "_PIPELINE_SECRET", "test-pipeline-secret")
    return TestClient(api.app)


class TestDirectorEndpointAuth:
    def test_no_authorization_header_returns_401(self, director_client):
        r = director_client.post(
            "/assess/sometoken/director",
            json={"assessment_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"},
        )
        assert r.status_code == 401

    def test_wrong_secret_returns_401(self, director_client):
        r = director_client.post(
            "/assess/sometoken/director",
            json={"assessment_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"},
            headers={"Authorization": "Bearer not-the-secret"},
        )
        assert r.status_code == 401

    def test_malformed_authorization_returns_401(self, director_client):
        # No "Bearer " prefix.
        r = director_client.post(
            "/assess/sometoken/director",
            json={"assessment_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"},
            headers={"Authorization": "test-pipeline-secret"},
        )
        assert r.status_code == 401

    def test_correct_secret_passes_auth_layer(self, director_client, monkeypatch):
        """With the correct secret, the request passes auth and proceeds to
        DB lookup. We stub the lookup to return None so the next step yields
        a 404 ("Role not found") — anything except 401 proves auth passed."""
        # _load_assessment_for_token imports get_role_by_token lazily from
        # core.db, so patching the symbol there is what matters.
        from core import db as core_db
        monkeypatch.setattr(core_db, "get_role_by_token", lambda token: None)

        r = director_client.post(
            "/assess/sometoken/director",
            json={"assessment_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"},
            headers={"Authorization": "Bearer test-pipeline-secret"},
        )
        # Auth passed → not 401. Implementation will currently return 404
        # because the stubbed lookup returns None. Assertion is auth-only,
        # not exact downstream behaviour.
        assert r.status_code != 401
