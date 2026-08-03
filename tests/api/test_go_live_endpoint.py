"""Go-live endpoint: /roles/{id}/go-live.

Roles can go live with zero dimensions (the interview becomes a general
conversational screen), but only when the hirer supplies a structured
reason for skipping them — that feedback is persisted for product review.
"""

import pytest
from fastapi.testclient import TestClient

_AUTH = {"Authorization": "Bearer test-pipeline-secret"}


@pytest.fixture
def golive_client(monkeypatch, sample_role):
    """TestClient with core.db + prompt assembly stubbed. `sample_role` is
    mutated per-test; update_role and insert_go_live_feedback capture their
    arguments for assertions."""
    import api
    import interview
    from core import db as core_db

    captured = {}
    feedback_rows = []

    def fake_update_role(role_id, **fields):
        captured.update(fields)
        return True

    def fake_insert_feedback(role_id, user_id, reason, details):
        feedback_rows.append({
            "role_id": role_id, "user_id": user_id,
            "reason": reason, "details": details,
        })
        return True

    monkeypatch.setattr(api, "_PIPELINE_SECRET", "test-pipeline-secret")
    monkeypatch.setattr(core_db, "get_role", lambda role_id: sample_role)
    monkeypatch.setattr(core_db, "update_role", fake_update_role)
    monkeypatch.setattr(core_db, "insert_go_live_feedback", fake_insert_feedback)
    monkeypatch.setattr(interview, "assemble_interview_prompt", lambda *a, **k: "PROMPT")
    client = TestClient(api.app)
    client.captured = captured
    client.feedback_rows = feedback_rows
    return client


class TestGoLive:
    def test_goes_live_with_dimensions(self, golive_client, sample_role):
        sample_role["status"] = "draft"
        r = golive_client.post("/roles/r1/go-live", headers=_AUTH)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "live"
        assert golive_client.captured["status"] == "live"
        assert golive_client.feedback_rows == []

    def test_single_dimension_allowed(self, golive_client, sample_role):
        sample_role["status"] = "draft"
        sample_role["dimensions"] = ["technical_depth"]
        r = golive_client.post("/roles/r1/go-live", headers=_AUTH)
        assert r.status_code == 200, r.text
        assert golive_client.feedback_rows == []

    def test_zero_dimensions_requires_reason(self, golive_client, sample_role):
        sample_role["status"] = "draft"
        sample_role["dimensions"] = []
        r = golive_client.post("/roles/r1/go-live", headers=_AUTH)
        assert r.status_code == 400
        assert "why" in r.json()["detail"].lower()

    def test_zero_dimensions_rejects_unknown_reason(self, golive_client, sample_role):
        sample_role["status"] = "draft"
        sample_role["dimensions"] = []
        r = golive_client.post(
            "/roles/r1/go-live",
            json={"no_dimensions_reason": "because"},
            headers=_AUTH,
        )
        assert r.status_code == 400

    def test_zero_dimensions_with_reason_goes_live(self, golive_client, sample_role):
        sample_role["status"] = "draft"
        sample_role["dimensions"] = []
        r = golive_client.post(
            "/roles/r1/go-live",
            json={"no_dimensions_reason": "general_screen"},
            headers=_AUTH,
        )
        assert r.status_code == 200, r.text
        assert golive_client.captured["status"] == "live"
        assert golive_client.feedback_rows == [{
            "role_id": "r1",
            "user_id": sample_role["user_id"],
            "reason": "general_screen",
            "details": None,
        }]

    def test_other_reason_stores_details(self, golive_client, sample_role):
        sample_role["status"] = "draft"
        sample_role["dimensions"] = []
        r = golive_client.post(
            "/roles/r1/go-live",
            json={"no_dimensions_reason": "other", "no_dimensions_details": "We use our own rubric."},
            headers=_AUTH,
        )
        assert r.status_code == 200, r.text
        assert golive_client.feedback_rows[0]["reason"] == "other"
        assert golive_client.feedback_rows[0]["details"] == "We use our own rubric."

    def test_details_dropped_for_non_other_reason(self, golive_client, sample_role):
        sample_role["status"] = "draft"
        sample_role["dimensions"] = []
        r = golive_client.post(
            "/roles/r1/go-live",
            json={"no_dimensions_reason": "just_testing", "no_dimensions_details": "ignore me"},
            headers=_AUTH,
        )
        assert r.status_code == 200, r.text
        assert golive_client.feedback_rows[0]["details"] is None

    def test_requires_internal_auth(self, golive_client, sample_role):
        sample_role["status"] = "draft"
        r = golive_client.post("/roles/r1/go-live")
        assert r.status_code in (401, 403)
