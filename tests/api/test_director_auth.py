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


class TestDirectorElapsedFromServer:
    """ENG-23: elapsed time must be derived from assessment.started_at, not
    from the client-supplied body field. The client used to send
    `elapsed_seconds` and the server trusted it — a tampered browser could
    keep the interview running past the role cap by under-reporting time."""

    def _stub(self, monkeypatch, started_at, duration_minutes=20):
        from core import db as core_db
        monkeypatch.setattr(
            core_db, "get_role_by_token",
            lambda token: {"id": "r1", "interview_duration_minutes": duration_minutes,
                           "dimensions": []},
        )
        monkeypatch.setattr(
            core_db, "get_assessment",
            lambda aid: {"id": aid, "role_id": "r1", "started_at": started_at,
                         "cv_extracted": "{}"},
        )

    def test_skips_when_no_started_at(self, director_client, monkeypatch):
        self._stub(monkeypatch, started_at=None)
        r = director_client.post(
            "/assess/tok/director",
            json={"assessment_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                  "elapsed_seconds": 60},
            headers={"Authorization": "Bearer test-pipeline-secret"},
        )
        assert r.status_code == 200
        assert r.json() == {"skip": True}

    def test_skips_when_past_cap_plus_buffer(self, director_client, monkeypatch):
        """Role duration is 20min; cap+buffer = 30min. Started 60min ago →
        skip even if the client claimed 5min elapsed."""
        from datetime import datetime, timezone, timedelta
        long_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        self._stub(monkeypatch, started_at=long_ago, duration_minutes=20)
        r = director_client.post(
            "/assess/tok/director",
            json={"assessment_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                  "elapsed_seconds": 300},  # client claims 5 min
            headers={"Authorization": "Bearer test-pipeline-secret"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["skip"] is True
        assert body.get("reason") == "past_duration_cap"

    def test_within_cap_proceeds(self, director_client, monkeypatch):
        """Started 5min ago, role is 20min — well within cap. Director
        should run; we stub director_directive to None so we can confirm
        the timing layer let us through."""
        from datetime import datetime, timezone, timedelta
        recent = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
        self._stub(monkeypatch, started_at=recent, duration_minutes=20)

        captured = {}

        async def fake_director(role, cv, messages, elapsed_seconds):
            # Timing test: we should see roughly 300s elapsed regardless
            # of what the client sent.
            captured["elapsed"] = elapsed_seconds
            return None

        import interview as interview_mod
        monkeypatch.setattr(interview_mod, "director_directive", fake_director)

        r = director_client.post(
            "/assess/tok/director",
            json={"assessment_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                  "elapsed_seconds": 0},  # client lies
            headers={"Authorization": "Bearer test-pipeline-secret"},
        )
        assert r.status_code == 200
        # Server-derived elapsed is ~300s, ignoring the client's 0.
        assert 290 <= captured["elapsed"] <= 320
