"""Plan endpoints: /roles/{id}/generate-plan and PATCH /roles/{id}/plan.

The core behaviour under test is the draft-only lock: once a role is live
the interview plan is immutable, and the PATCH revalidates the hirer-edited
payload against the canonical InterviewPlan shape.
"""

import pytest
from fastapi.testclient import TestClient

_AUTH = {"Authorization": "Bearer test-pipeline-secret"}


def _valid_plan():
    return {
        "overview": "Voice interview probing backend judgment.",
        "opening_approach": "Welcome, anchor on CV.",
        "dimension_plans": [
            {
                "dimension": "technical_depth",
                "focus": "Scaling limits.",
                "probing_strategy": "Ask where the design breaks.",
                "evaluation_criteria": "Strong: names failure modes.",
                "example_questions": ["Where does it fall over under 10x load?"],
            },
        ],
        "closing_approach": "Invite questions, close.",
    }


@pytest.fixture
def plan_client(monkeypatch, sample_role):
    """TestClient with core.db stubbed. `sample_role` is mutated per-test to
    flip draft/live; update_role captures its kwargs for assertions."""
    import api
    from core import db as core_db

    captured = {}

    def fake_update_role(role_id, **fields):
        captured.update(fields)
        return True

    # api.py reads the secret into a module-level _PIPELINE_SECRET at import
    # time, so the env var from conftest isn't enough if api was imported
    # earlier under a different env. Patch the module attribute directly.
    monkeypatch.setattr(api, "_PIPELINE_SECRET", "test-pipeline-secret")
    monkeypatch.setattr(core_db, "get_role", lambda role_id: sample_role)
    monkeypatch.setattr(core_db, "update_role", fake_update_role)
    client = TestClient(api.app)
    client.captured = captured
    return client


class TestUpdatePlan:
    def test_draft_role_plan_saves(self, plan_client, sample_role):
        sample_role["status"] = "draft"
        r = plan_client.patch(
            "/roles/r1/plan", json={"interview_plan": _valid_plan()}, headers=_AUTH,
        )
        assert r.status_code == 200, r.text
        assert plan_client.captured["interview_plan"]["overview"].startswith("Voice interview")
        assert plan_client.captured["interview_plan_edited_at"]

    def test_live_role_plan_locked(self, plan_client, sample_role):
        sample_role["status"] = "live"
        r = plan_client.patch(
            "/roles/r1/plan", json={"interview_plan": _valid_plan()}, headers=_AUTH,
        )
        assert r.status_code == 409
        assert "locked" in r.json()["detail"].lower()

    def test_paused_role_plan_locked(self, plan_client, sample_role):
        # Pausing does not reopen the plan — only true drafts are editable.
        sample_role["status"] = "paused"
        r = plan_client.patch(
            "/roles/r1/plan", json={"interview_plan": _valid_plan()}, headers=_AUTH,
        )
        assert r.status_code == 409

    def test_invalid_shape_rejected(self, plan_client, sample_role):
        sample_role["status"] = "draft"
        r = plan_client.patch(
            "/roles/r1/plan",
            json={"interview_plan": {"dimension_plans": "not-a-list"}},
            headers=_AUTH,
        )
        assert r.status_code == 422

    def test_requires_internal_auth(self, plan_client, sample_role):
        sample_role["status"] = "draft"
        r = plan_client.patch("/roles/r1/plan", json={"interview_plan": _valid_plan()})
        assert r.status_code in (401, 403)


class TestGeneratePlan:
    def test_requires_dimensions(self, plan_client, sample_role):
        sample_role["status"] = "draft"
        sample_role["dimensions"] = []
        r = plan_client.post("/roles/r1/generate-plan", headers=_AUTH)
        assert r.status_code == 400

    def test_generates_and_stores(self, plan_client, sample_role, monkeypatch):
        sample_role["status"] = "draft"
        import agents.interview_plan as plan_agent

        async def fake_generate(role):
            return _valid_plan()

        monkeypatch.setattr(plan_agent, "generate_interview_plan", fake_generate)
        r = plan_client.post("/roles/r1/generate-plan", headers=_AUTH)
        assert r.status_code == 200, r.text
        assert r.json()["interview_plan"]["overview"].startswith("Voice interview")
        assert plan_client.captured["interview_plan"]["closing_approach"]

    def test_llm_error_surfaces_502(self, plan_client, sample_role, monkeypatch):
        sample_role["status"] = "draft"
        import agents.interview_plan as plan_agent

        async def fake_generate(role):
            return {"error": "schema_validation_failed"}

        monkeypatch.setattr(plan_agent, "generate_interview_plan", fake_generate)
        r = plan_client.post("/roles/r1/generate-plan", headers=_AUTH)
        assert r.status_code == 502
