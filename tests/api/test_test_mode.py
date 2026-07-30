"""Test Mode (is_mock) containment.

Mock-ness is decided once, server-side, at /assess/{token}/start: only
when TEST_MODE_ENABLED is on AND the link resolved to the designated
TEST_MODE_ROLE_ID. Every downstream consumer (conv-init prompt swap,
finalize/complete report skip) reads the stored flag — no client input
can create a mock session on a real role or turn a mock one real, and
mock sessions never write reports or dimension_scores.
"""

import json

import pytest
from fastapi.testclient import TestClient

import api

TEST_ROLE_ID = "99999999-9999-9999-9999-999999999999"


def _role(role_id: str) -> dict:
    return {
        "id": role_id,
        "status": "live",
        "title": "Test Role",
        "company_name": "Acme",
        "job_description": "JD",
        "dimensions": ["technical_depth"],
        "technical_depth": "application",
        "interview_duration_minutes": 15,
        "custom_instructions": "",
        "org_id": None,
        "interviewer_voice_id": None,
    }


@pytest.fixture
def client():
    return TestClient(api.app)


@pytest.fixture
def start_stubs(monkeypatch):
    """Stub every collaborator /start touches; capture the insert dict."""
    from core import db as core_db
    from agents import cv_extract as cv_agent
    import interview

    created: list[dict] = []

    def fake_create_assessment(payload):
        created.append(payload)
        return {**payload, "id": "a-1"}

    monkeypatch.setattr(core_db, "get_active_assessment_for_candidate", lambda *a: None)
    monkeypatch.setattr(core_db, "create_assessment", fake_create_assessment)
    monkeypatch.setattr(core_db, "update_assessment", lambda *a, **k: True)
    monkeypatch.setattr(core_db, "create_interview_session", lambda *a: {"id": "s-1"})

    async def fake_extract_cv(cv_text, jd):
        return {"name": "Test Er", "experience_path": "path_a"}

    monkeypatch.setattr(cv_agent, "extract_cv", fake_extract_cv)
    monkeypatch.setattr(interview, "assemble_interview_prompt", lambda *a, **k: "REAL PROMPT")
    return created


def _post_start(client, monkeypatch, start_stubs, *, enabled, role_id):
    from core import db as core_db
    monkeypatch.setattr(core_db, "get_role_by_token", lambda token: _role(role_id))
    monkeypatch.setattr(api, "_TEST_MODE_ENABLED", enabled)
    monkeypatch.setattr(api, "_TEST_MODE_ROLE_ID", TEST_ROLE_ID)
    r = client.post(
        "/assess/tok/start",
        json={
            "candidate_user_id": "u-1",
            "candidate_name": "Test Er",
            "candidate_email": "t@example.com",
            "cv_text": "x" * 100,
        },
    )
    assert r.status_code == 200, r.text
    return start_stubs[-1]


class TestStartStampsIsMock:
    def test_gate_off_means_never_mock_even_on_test_role(self, client, monkeypatch, start_stubs):
        row = _post_start(client, monkeypatch, start_stubs, enabled=False, role_id=TEST_ROLE_ID)
        assert row["is_mock"] is False

    def test_gate_on_plus_test_role_is_mock(self, client, monkeypatch, start_stubs):
        row = _post_start(client, monkeypatch, start_stubs, enabled=True, role_id=TEST_ROLE_ID)
        assert row["is_mock"] is True

    def test_gate_on_but_real_role_is_not_mock(self, client, monkeypatch, start_stubs):
        row = _post_start(
            client, monkeypatch, start_stubs,
            enabled=True, role_id="11111111-1111-1111-1111-111111111111",
        )
        assert row["is_mock"] is False

    def test_unset_role_id_is_never_mock(self, client, monkeypatch, start_stubs):
        from core import db as core_db
        monkeypatch.setattr(core_db, "get_role_by_token", lambda token: _role(TEST_ROLE_ID))
        monkeypatch.setattr(api, "_TEST_MODE_ENABLED", True)
        monkeypatch.setattr(api, "_TEST_MODE_ROLE_ID", "")
        r = client.post(
            "/assess/tok/start",
            json={
                "candidate_user_id": "u-1",
                "candidate_name": "Test Er",
                "candidate_email": "t@example.com",
                "cv_text": "x" * 100,
            },
        )
        assert r.status_code == 200, r.text
        assert start_stubs[-1]["is_mock"] is False


@pytest.fixture
def conv_init_stubs(monkeypatch):
    """Session-token secret + DB rows for /elevenlabs/conv-init."""
    from core import db as core_db
    import interview

    monkeypatch.setattr(api, "_INTERVIEW_SESSION_SECRET", "test-session-secret")
    monkeypatch.setattr(api, "_ELEVENLABS_WEBHOOK_SECRET", "")
    monkeypatch.setattr(core_db, "get_role", lambda role_id: _role(TEST_ROLE_ID))
    monkeypatch.setattr(interview, "assemble_interview_prompt", lambda *a, **k: "REAL PROMPT")

    def set_assessment(is_mock: bool):
        monkeypatch.setattr(core_db, "get_assessment", lambda aid: {
            "id": aid,
            "role_id": TEST_ROLE_ID,
            "candidate_name": "Test Er",
            "cv_extracted": {},
            "is_mock": is_mock,
        })

    return set_assessment


def _conv_init(client, is_mock, conv_init_stubs):
    conv_init_stubs(is_mock)
    token = api._mint_session_prompt_token("a-1")
    r = client.post("/elevenlabs/conv-init", json={
        "conversation_initiation_client_data": {
            "dynamic_variables": {"session_token": token},
        },
    })
    assert r.status_code == 200, r.text
    return r.json()["conversation_config_override"]["agent"]["prompt"]["prompt"]


class TestConvInitPromptSwap:
    def test_mock_session_gets_smalltalk_prompt(self, client, conv_init_stubs):
        prompt = _conv_init(client, True, conv_init_stubs)
        assert "TEST MODE" in prompt
        assert "small talk" in prompt
        # Name substitution happened and no evaluative rubric leaked in.
        assert "Test Er" in prompt
        assert "REAL PROMPT" not in prompt

    def test_real_session_gets_real_prompt(self, client, conv_init_stubs):
        prompt = _conv_init(client, False, conv_init_stubs)
        assert prompt == "REAL PROMPT"
        assert "TEST MODE" not in prompt


@pytest.fixture
def report_recorder(monkeypatch):
    """Replace interview.generate_reports with a synchronous recorder that
    still hands asyncio.create_task a real coroutine."""
    import interview

    calls: list[tuple] = []

    def fake_generate_reports(*args, **kwargs):
        calls.append(args)

        async def _noop():
            return None

        return _noop()

    monkeypatch.setattr(interview, "generate_reports", fake_generate_reports)
    return calls


def _complete_stubs(monkeypatch, is_mock: bool):
    from core import db as core_db
    monkeypatch.setattr(core_db, "get_role_by_token", lambda token: _role(TEST_ROLE_ID))
    monkeypatch.setattr(core_db, "get_assessment", lambda aid: {
        "id": aid,
        "role_id": TEST_ROLE_ID,
        "cv_extracted": json.dumps({"name": "Test Er"}),
        "is_mock": is_mock,
    })
    monkeypatch.setattr(core_db, "update_assessment", lambda *a, **k: True)


class TestCompleteSkipsReportsForMock:
    def test_mock_complete_generates_no_reports(self, client, monkeypatch, report_recorder):
        _complete_stubs(monkeypatch, is_mock=True)
        r = client.post("/assess/tok/complete", json={"assessment_id": "a-1"})
        assert r.status_code == 200, r.text
        assert report_recorder == []

    def test_real_complete_generates_reports(self, client, monkeypatch, report_recorder):
        _complete_stubs(monkeypatch, is_mock=False)
        r = client.post("/assess/tok/complete", json={"assessment_id": "a-1"})
        assert r.status_code == 200, r.text
        assert len(report_recorder) == 1


class _FakeELResponse:
    status_code = 200

    @staticmethod
    def json():
        return {
            "status": "done",
            "transcript": [
                {"role": "agent", "message": "Hi, how's your day?"},
                {"role": "user", "message": "Great, thanks."},
            ],
        }


class _FakeAsyncClient:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, *args, **kwargs):
        return _FakeELResponse()


def _finalize_stubs(monkeypatch, is_mock: bool):
    from core import db as core_db
    monkeypatch.setattr("httpx.AsyncClient", _FakeAsyncClient)
    monkeypatch.setattr(core_db, "get_role_by_token", lambda token: _role(TEST_ROLE_ID))
    monkeypatch.setattr(core_db, "get_assessment", lambda aid: {
        "id": aid,
        "role_id": TEST_ROLE_ID,
        "cv_extracted": {},
        "is_mock": is_mock,
    })
    monkeypatch.setattr(core_db, "get_interview_session", lambda aid: None)
    monkeypatch.setattr(core_db, "update_assessment", lambda *a, **k: True)


class TestFinalizeSkipsReportsForMock:
    def test_mock_finalize_generates_no_reports(self, client, monkeypatch, report_recorder):
        _finalize_stubs(monkeypatch, is_mock=True)
        r = client.post("/assess/tok/finalize", json={
            "assessment_id": "a-1",
            "conversation_id": "conv-1",
        })
        assert r.status_code == 200, r.text
        assert r.json()["message_count"] == 2
        assert report_recorder == []

    def test_real_finalize_generates_reports(self, client, monkeypatch, report_recorder):
        _finalize_stubs(monkeypatch, is_mock=False)
        r = client.post("/assess/tok/finalize", json={
            "assessment_id": "a-1",
            "conversation_id": "conv-1",
        })
        assert r.status_code == 200, r.text
        assert len(report_recorder) == 1
