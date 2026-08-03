"""Copilot endpoints: session lifecycle, live-role gate, and sign-off rules.

Core behaviours under test:
- sessions can only be created against live roles (plan approved + locked)
- the transcript/tick endpoints refuse sessions outside the live phase
- overriding a proposed score requires a reason; every selected dimension
  must be scored; the human-confirmed scores become the record
"""

import pytest
from fastapi.testclient import TestClient

_AUTH = {"Authorization": "Bearer test-pipeline-secret"}

_SESSION_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"


def _proposed_review():
    return {
        "proposed_scores": [
            {"dimension": "judgment_under_ambiguity", "score": 4,
             "quotation_basis": "We chose Postgres to keep ops simple.",
             "notes": "Concrete tradeoff.", "verified": True},
            {"dimension": "technical_depth", "score": 3,
             "quotation_basis": "", "notes": "Insufficient evidence.", "verified": False},
        ],
        "synthesis": "Pragmatic, grounded engineer.",
    }


@pytest.fixture
def copilot_session():
    return {
        "id": _SESSION_ID,
        "assessment_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "interviewer_user_id": "22222222-2222-2222-2222-222222222222",
        "status": "live",
        "consent": None,
        "brief_pack": None,
        "transcript": [{"text": "Earlier answer.", "at": "2026-08-03T10:00:00Z"}],
        "live_state": None,
        "proposed_review": None,
        "started_at": "2026-08-03T10:00:00Z",
        "ended_at": None,
    }


@pytest.fixture
def copilot_client(monkeypatch, sample_role, sample_assessment, copilot_session):
    import api
    from core import db as core_db

    captured = {"session_updates": {}, "assessment_updates": {}, "scores": None,
                "reports": {}, "probe_events": []}

    monkeypatch.setattr(api, "_PIPELINE_SECRET", "test-pipeline-secret")
    monkeypatch.setattr(core_db, "get_role", lambda role_id: sample_role)
    monkeypatch.setattr(core_db, "get_assessment", lambda aid: sample_assessment)
    monkeypatch.setattr(core_db, "get_copilot_session", lambda sid: copilot_session)

    def fake_update_session(sid, **fields):
        captured["session_updates"].update(fields)
        copilot_session.update(fields)
        return True

    def fake_update_assessment(aid, **fields):
        captured["assessment_updates"].update(fields)
        return True

    def fake_save_scores(aid, rows, signed_off_by):
        captured["scores"] = (aid, rows, signed_off_by)
        return True

    def fake_save_report(aid, kind, content):
        captured["reports"][kind] = content
        return True

    def fake_probe_event(sid, action, **kwargs):
        captured["probe_events"].append((action, kwargs))
        return {"id": "pe1"}

    monkeypatch.setattr(core_db, "update_copilot_session", fake_update_session)
    monkeypatch.setattr(core_db, "update_assessment", fake_update_assessment)
    monkeypatch.setattr(core_db, "save_copilot_dimension_scores", fake_save_scores)
    monkeypatch.setattr(core_db, "save_report", fake_save_report)
    monkeypatch.setattr(core_db, "log_copilot_probe_event", fake_probe_event)

    client = TestClient(api.app)
    client.captured = captured
    return client


class TestCreateSession:
    def _body(self, **overrides):
        body = {
            "role_id": "11111111-1111-1111-1111-111111111111",
            "interviewer_user_id": "22222222-2222-2222-2222-222222222222",
            "candidate_name": "Amara Osei",
            "candidate_email": "amara@example.com",
        }
        body.update(overrides)
        return body

    def test_requires_internal_auth(self, copilot_client):
        r = copilot_client.post("/copilot/sessions", json=self._body())
        assert r.status_code in (401, 403)

    def test_draft_role_rejected(self, copilot_client, sample_role):
        sample_role["status"] = "draft"
        r = copilot_client.post("/copilot/sessions", json=self._body(), headers=_AUTH)
        assert r.status_code == 409
        assert "live" in r.json()["detail"].lower()

    def test_invalid_email_rejected(self, copilot_client, sample_role):
        sample_role["status"] = "live"
        r = copilot_client.post(
            "/copilot/sessions", json=self._body(candidate_email="not-an-email"), headers=_AUTH,
        )
        assert r.status_code == 400

    def test_creates_assessment_and_session(self, copilot_client, sample_role, monkeypatch):
        sample_role["status"] = "live"
        from core import db as core_db

        created = {}

        def fake_create_assessment(payload):
            created["assessment"] = payload
            return {"id": "new-assessment", **payload}

        def fake_create_session(aid, interviewer):
            created["session"] = (aid, interviewer)
            return {"id": "new-session", "assessment_id": aid}

        monkeypatch.setattr(core_db, "create_assessment", fake_create_assessment)
        monkeypatch.setattr(core_db, "create_copilot_session", fake_create_session)

        r = copilot_client.post("/copilot/sessions", json=self._body(), headers=_AUTH)
        assert r.status_code == 200, r.text
        assert r.json() == {"session_id": "new-session", "assessment_id": "new-assessment"}
        assert created["assessment"]["source"] == "copilot"
        assert created["assessment"]["candidate_email"] == "amara@example.com"
        assert created["session"] == ("new-assessment", "22222222-2222-2222-2222-222222222222")


class TestTranscript:
    def test_rejects_when_not_live(self, copilot_client, copilot_session):
        copilot_session["status"] = "review"
        r = copilot_client.post(
            f"/copilot/sessions/{_SESSION_ID}/transcript",
            json={"segments": [{"text": "hello"}]}, headers=_AUTH,
        )
        assert r.status_code == 409

    def test_appends_cleaned_segments(self, copilot_client, copilot_session, monkeypatch):
        from core import db as core_db
        appended = {}

        def fake_append(sid, segments):
            appended["segments"] = segments
            return (copilot_session["transcript"] or []) + segments

        monkeypatch.setattr(core_db, "append_copilot_transcript", fake_append)
        r = copilot_client.post(
            f"/copilot/sessions/{_SESSION_ID}/transcript",
            json={"segments": [
                {"text": "  A real answer.  ", "elapsed_seconds": 42},
                {"text": "", "elapsed_seconds": 43},  # dropped
            ]},
            headers=_AUTH,
        )
        assert r.status_code == 200, r.text
        assert r.json()["appended"] == 1
        assert appended["segments"][0]["text"] == "A real answer."
        assert appended["segments"][0]["elapsed_seconds"] == 42


class TestTick:
    def test_agent_error_becomes_skip(self, copilot_client, monkeypatch):
        import agents.copilot_live as live_mod

        async def fake_tick(role, session, elapsed):
            return {"error": "empty_transcript"}

        monkeypatch.setattr(live_mod, "copilot_tick", fake_tick)
        r = copilot_client.post(
            f"/copilot/sessions/{_SESSION_ID}/tick",
            json={"elapsed_seconds": 60}, headers=_AUTH,
        )
        assert r.status_code == 200
        assert r.json()["skip"] is True

    def test_success_persists_state_and_logs_probe(self, copilot_client, monkeypatch):
        import agents.copilot_live as live_mod

        async def fake_tick(role, session, elapsed):
            return {
                "saturation": {"technical_depth": "partial"},
                "probe": {"dimension": "technical_depth", "technique": "Parameter Verification",
                          "text": "What was the measured latency?", "reason": "No numbers."},
                "authenticity_flags": [],
                "pacing": "",
            }

        monkeypatch.setattr(live_mod, "copilot_tick", fake_tick)
        r = copilot_client.post(
            f"/copilot/sessions/{_SESSION_ID}/tick",
            json={"elapsed_seconds": 120}, headers=_AUTH,
        )
        assert r.status_code == 200, r.text
        assert r.json()["saturation"]["technical_depth"] == "partial"
        assert copilot_client.captured["session_updates"]["live_state"]["probe"]["text"]
        actions = [a for a, _ in copilot_client.captured["probe_events"]]
        assert actions == ["suggested"]


class TestReview:
    def _submit(self, client, scores, synthesis="Pragmatic, grounded engineer."):
        return client.post(
            f"/copilot/sessions/{_SESSION_ID}/review",
            json={"signed_off_by": "22222222-2222-2222-2222-222222222222",
                  "synthesis": synthesis, "scores": scores},
            headers=_AUTH,
        )

    @pytest.fixture(autouse=True)
    def _review_state(self, copilot_session, monkeypatch):
        copilot_session["status"] = "review"
        copilot_session["proposed_review"] = _proposed_review()
        # The background candidate-report task must never fire real calls.
        import api

        async def fake_candidate_report(*args, **kwargs):
            return None

        monkeypatch.setattr(api, "_copilot_candidate_report", fake_candidate_report)

    def test_override_without_reason_rejected(self, copilot_client):
        r = self._submit(copilot_client, [
            {"dimension": "judgment_under_ambiguity", "score": 2},  # proposed 4, no reason
            {"dimension": "technical_depth", "score": 3},
        ])
        assert r.status_code == 400
        assert "reason" in r.json()["detail"].lower()

    def test_missing_dimension_rejected(self, copilot_client):
        r = self._submit(copilot_client, [
            {"dimension": "judgment_under_ambiguity", "score": 4},
        ])
        assert r.status_code == 400
        assert "technical_depth" in r.json()["detail"]

    def test_confirm_and_override_with_reason_succeeds(self, copilot_client):
        r = self._submit(copilot_client, [
            {"dimension": "judgment_under_ambiguity", "score": 4},
            {"dimension": "technical_depth", "score": 4,
             "override_reason": "They elaborated depth verbally that the engine underweighted."},
        ])
        assert r.status_code == 200, r.text
        aid, rows, signer = copilot_client.captured["scores"]
        by_dim = {row["dimension"]: row for row in rows}
        assert by_dim["technical_depth"]["score"] == 4
        assert by_dim["technical_depth"]["proposed_score"] == 3
        assert by_dim["technical_depth"]["override_reason"]
        assert by_dim["judgment_under_ambiguity"]["override_reason"] is None
        assert signer == "22222222-2222-2222-2222-222222222222"
        # Hirer report assembled from the confirmed (human) scores.
        hirer = copilot_client.captured["reports"]["hirer"]
        assert hirer["source"] == "copilot"
        assert hirer["composite_score"] == 4.0
        assert copilot_client.captured["assessment_updates"]["status"] == "completed"
        assert copilot_client.captured["session_updates"]["status"] == "submitted"

    def test_double_submit_rejected(self, copilot_client, copilot_session):
        copilot_session["status"] = "submitted"
        r = self._submit(copilot_client, [
            {"dimension": "judgment_under_ambiguity", "score": 4},
            {"dimension": "technical_depth", "score": 3},
        ])
        assert r.status_code == 409


class TestWrapup:
    def test_cached_review_returned(self, copilot_client, copilot_session):
        copilot_session["status"] = "review"
        copilot_session["proposed_review"] = _proposed_review()
        r = copilot_client.post(f"/copilot/sessions/{_SESSION_ID}/wrapup", headers=_AUTH)
        assert r.status_code == 200
        assert r.json()["cached"] is True

    def test_agent_error_returns_502(self, copilot_client, copilot_session, monkeypatch):
        import agents.copilot_score as score_mod

        async def fake_review(role, session, cv):
            return {"error": "schema_validation_failed"}

        monkeypatch.setattr(score_mod, "generate_proposed_review", fake_review)
        copilot_session["status"] = "live"
        r = copilot_client.post(f"/copilot/sessions/{_SESSION_ID}/wrapup", headers=_AUTH)
        assert r.status_code == 502

    def test_success_stores_review(self, copilot_client, copilot_session, monkeypatch):
        import agents.copilot_score as score_mod

        async def fake_review(role, session, cv):
            return _proposed_review()

        monkeypatch.setattr(score_mod, "generate_proposed_review", fake_review)
        copilot_session["status"] = "live"
        r = copilot_client.post(f"/copilot/sessions/{_SESSION_ID}/wrapup", headers=_AUTH)
        assert r.status_code == 200, r.text
        assert r.json()["cached"] is False
        assert copilot_client.captured["session_updates"]["status"] == "review"
        assert copilot_client.captured["session_updates"]["proposed_review"]["synthesis"]
