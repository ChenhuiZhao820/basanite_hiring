"""Copilot bot-join (Google Meet via Recall): URL gate, signed webhook, ingestion.

Core behaviours under test:
- bot creation is Google Meet only, and only after consent (status=live)
- the transcript webhook rejects unsigned / mis-signed requests (fail closed)
- verified transcript.data events land as speaker-labelled segments
"""

import base64
import hashlib
import hmac
import json
import time

import pytest
from fastapi.testclient import TestClient

_AUTH = {"Authorization": "Bearer test-pipeline-secret"}
_SESSION_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"
_BOT_ID = "bot-123"
_SECRET_BYTES = b"\x07" * 24
_WHSEC = "whsec_" + base64.b64encode(_SECRET_BYTES).decode()


def _sign(body: bytes, *, secret: bytes = _SECRET_BYTES, ts: int | None = None) -> dict:
    svix_id = "msg_test"
    svix_ts = str(ts if ts is not None else int(time.time()))
    signed = f"{svix_id}.{svix_ts}.".encode() + body
    sig = base64.b64encode(hmac.new(secret, signed, hashlib.sha256).digest()).decode()
    return {"svix-id": svix_id, "svix-timestamp": svix_ts, "svix-signature": f"v1,{sig}"}


def _transcript_event(text: str = "I led the migration myself.", speaker: str = "Jane Candidate"):
    return {
        "event": "transcript.data",
        "data": {
            "bot": {"id": _BOT_ID},
            "data": {
                "words": [
                    {"text": text, "start_timestamp": {"relative": 42.5}},
                ],
                "participant": {"id": 1, "name": speaker},
            },
        },
    }


@pytest.fixture
def copilot_session():
    return {
        "id": _SESSION_ID,
        "assessment_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "interviewer_user_id": "22222222-2222-2222-2222-222222222222",
        "status": "live",
        "bot": None,
        "transcript": [],
    }


@pytest.fixture
def bot_client(monkeypatch, copilot_session):
    import api
    from core import db as core_db

    captured = {"session_updates": {}, "appended": None}

    monkeypatch.setattr(api, "_PIPELINE_SECRET", "test-pipeline-secret")
    monkeypatch.setenv("RECALL_API_KEY", "test-recall-key")
    monkeypatch.setenv("RECALL_WEBHOOK_SECRET", _WHSEC)
    monkeypatch.setenv("PIPELINE_PUBLIC_URL", "https://api.basanite.test")
    monkeypatch.setattr(core_db, "get_copilot_session", lambda sid: copilot_session)
    monkeypatch.setattr(core_db, "get_copilot_session_by_bot_id",
                        lambda bid: copilot_session if bid == _BOT_ID else None)

    def fake_update_session(sid, **fields):
        captured["session_updates"].update(fields)
        copilot_session.update(fields)
        return True

    def fake_append(sid, segments):
        captured["appended"] = (sid, segments)
        return segments

    monkeypatch.setattr(core_db, "update_copilot_session", fake_update_session)
    monkeypatch.setattr(core_db, "append_copilot_transcript", fake_append)

    client = TestClient(api.app)
    client.captured = captured
    return client


class _FakeRecallResponse:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


class _FakeRecallClient:
    """Stands in for httpx.AsyncClient; records the create-bot payload."""

    last_payload: dict | None = None
    response = _FakeRecallResponse(201, {"id": _BOT_ID})

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, headers=None, json=None):
        _FakeRecallClient.last_payload = {"url": url, "json": json}
        return _FakeRecallClient.response


class TestCreateBot:
    def _post(self, client, url="https://meet.google.com/abc-defg-hij"):
        return client.post(
            f"/copilot/sessions/{_SESSION_ID}/bot",
            json={"meeting_url": url}, headers=_AUTH,
        )

    def test_requires_internal_auth(self, bot_client):
        r = bot_client.post(f"/copilot/sessions/{_SESSION_ID}/bot",
                            json={"meeting_url": "https://meet.google.com/abc-defg-hij"})
        assert r.status_code in (401, 403)

    def test_rejects_non_meet_urls(self, bot_client, monkeypatch):
        monkeypatch.setattr("httpx.AsyncClient", _FakeRecallClient)
        for url in (
            "https://zoom.us/j/123456",
            "https://teams.microsoft.com/l/meetup-join/x",
            "https://meet.google.com.evil.com/abc-defg-hij",
            "http://meet.google.com/abc-defg-hij",  # not https
        ):
            r = self._post(bot_client, url)
            assert r.status_code == 400, url

    def test_requires_consent_first(self, bot_client, copilot_session, monkeypatch):
        monkeypatch.setattr("httpx.AsyncClient", _FakeRecallClient)
        copilot_session["status"] = "briefing"
        r = self._post(bot_client)
        assert r.status_code == 409

    def test_creates_bot_and_stores_id(self, bot_client, monkeypatch):
        monkeypatch.setattr("httpx.AsyncClient", _FakeRecallClient)
        _FakeRecallClient.response = _FakeRecallResponse(201, {"id": _BOT_ID})
        r = self._post(bot_client)
        assert r.status_code == 200, r.text
        assert r.json() == {"bot_id": _BOT_ID, "cached": False}
        assert bot_client.captured["session_updates"]["bot"]["id"] == _BOT_ID
        # The create payload wires the realtime transcript webhook back to us.
        payload = _FakeRecallClient.last_payload["json"]
        endpoint = payload["recording_config"]["realtime_endpoints"][0]
        assert endpoint["url"] == "https://api.basanite.test/copilot/bot-webhook"
        assert "transcript.data" in endpoint["events"]

    def test_existing_bot_is_idempotent(self, bot_client, copilot_session, monkeypatch):
        monkeypatch.setattr("httpx.AsyncClient", _FakeRecallClient)
        copilot_session["bot"] = {"id": _BOT_ID, "status": "joining"}
        r = self._post(bot_client)
        assert r.status_code == 200
        assert r.json()["cached"] is True

    def test_recall_capacity_507_surfaces_retryable_502(self, bot_client, monkeypatch):
        monkeypatch.setattr("httpx.AsyncClient", _FakeRecallClient)
        _FakeRecallClient.response = _FakeRecallResponse(507, {})
        r = self._post(bot_client)
        assert r.status_code == 502
        assert "retry" in r.json()["detail"].lower()
        _FakeRecallClient.response = _FakeRecallResponse(201, {"id": _BOT_ID})


class TestBotWebhook:
    def test_unsigned_request_rejected(self, bot_client):
        body = json.dumps(_transcript_event()).encode()
        r = bot_client.post("/copilot/bot-webhook", content=body,
                            headers={"Content-Type": "application/json"})
        assert r.status_code == 401

    def test_wrong_secret_rejected(self, bot_client):
        body = json.dumps(_transcript_event()).encode()
        headers = _sign(body, secret=b"\x09" * 24)
        r = bot_client.post("/copilot/bot-webhook", content=body, headers=headers)
        assert r.status_code == 401

    def test_stale_timestamp_rejected(self, bot_client):
        body = json.dumps(_transcript_event()).encode()
        headers = _sign(body, ts=int(time.time()) - 3600)
        r = bot_client.post("/copilot/bot-webhook", content=body, headers=headers)
        assert r.status_code == 401

    def test_missing_secret_fails_closed(self, bot_client, monkeypatch):
        monkeypatch.delenv("RECALL_WEBHOOK_SECRET", raising=False)
        body = json.dumps(_transcript_event()).encode()
        r = bot_client.post("/copilot/bot-webhook", content=body, headers=_sign(body))
        assert r.status_code == 401

    def test_verified_transcript_appends_speaker_segment(self, bot_client):
        body = json.dumps(_transcript_event()).encode()
        r = bot_client.post("/copilot/bot-webhook", content=body, headers=_sign(body))
        assert r.status_code == 200, r.text
        sid, segments = bot_client.captured["appended"]
        assert sid == _SESSION_ID
        assert segments[0]["text"] == "I led the migration myself."
        assert segments[0]["speaker"] == "Jane Candidate"
        assert segments[0]["elapsed_seconds"] == 42

    def test_unknown_bot_id_ignored(self, bot_client):
        event = _transcript_event()
        event["data"]["bot"]["id"] = "someone-elses-bot"
        body = json.dumps(event).encode()
        r = bot_client.post("/copilot/bot-webhook", content=body, headers=_sign(body))
        assert r.status_code == 200
        assert r.json()["no_session"] is True
        assert bot_client.captured["appended"] is None

    def test_non_transcript_events_ignored(self, bot_client):
        body = json.dumps({"event": "participant_events.join", "data": {}}).encode()
        r = bot_client.post("/copilot/bot-webhook", content=body, headers=_sign(body))
        assert r.status_code == 200
        assert r.json()["ignored"] is True
