"""Shared pytest fixtures.

The whole suite runs offline. Anything that would call an external service
(Anthropic, Supabase, Resend, Merge, ElevenLabs, WeasyPrint) is replaced with
a configurable fake here so tests stay deterministic and don't need API keys.
"""

from __future__ import annotations

import base64
import os
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, AsyncMock, patch

import pytest

# Ensure the project root is importable as a package root.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@pytest.fixture(autouse=True)
def env_vars(monkeypatch):
    """Provide deterministic env vars to every test.

    Individual tests can override by calling monkeypatch.setenv themselves.
    """
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-anthropic-key")
    monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "test-service-key")
    monkeypatch.setenv("PIPELINE_API_SECRET", "test-pipeline-secret")
    monkeypatch.setenv("RESEND_API_KEY", "test-resend-key")
    monkeypatch.setenv("RESEND_FROM", "Basanite <test@basanite.test>")
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-eleven-key")
    monkeypatch.setenv("ELEVENLABS_AGENT_ID", "test-agent")
    monkeypatch.setenv("MERGE_API_KEY_PROD", "test-merge-prod")
    monkeypatch.setenv("MERGE_API_KEY_TEST", "test-merge-test")
    monkeypatch.setenv("MERGE_ENV", "test")
    monkeypatch.setenv("MERGE_WEBHOOK_SECRET", "test-webhook-secret")
    # 32-byte AES key, base64-encoded.
    monkeypatch.setenv("ATS_TOKEN_ENC_KEY", base64.urlsafe_b64encode(b"\x01" * 32).decode())
    monkeypatch.setenv(
        "PUBLIC_REPORT_SIGNING_KEY",
        base64.urlsafe_b64encode(b"\x02" * 32).decode(),
    )


# ---- Supabase fake ---------------------------------------------------------

class FakeQuery:
    """Records every fluent call and returns an `execute()` payload that
    tests can configure via the parent FakeTable."""

    def __init__(self, table: "FakeTable"):
        self._table = table
        self.calls: list[tuple[str, tuple, dict]] = []

    def _record(self, name, *args, **kwargs):
        self.calls.append((name, args, kwargs))
        self._table.calls.append((name, args, kwargs))
        return self

    def select(self, *args, **kwargs): return self._record("select", *args, **kwargs)
    def insert(self, *args, **kwargs): return self._record("insert", *args, **kwargs)
    def update(self, *args, **kwargs): return self._record("update", *args, **kwargs)
    def upsert(self, *args, **kwargs): return self._record("upsert", *args, **kwargs)
    def delete(self, *args, **kwargs): return self._record("delete", *args, **kwargs)
    def eq(self, *args, **kwargs): return self._record("eq", *args, **kwargs)
    def neq(self, *args, **kwargs): return self._record("neq", *args, **kwargs)
    def lt(self, *args, **kwargs): return self._record("lt", *args, **kwargs)
    def lte(self, *args, **kwargs): return self._record("lte", *args, **kwargs)
    def gt(self, *args, **kwargs): return self._record("gt", *args, **kwargs)
    def gte(self, *args, **kwargs): return self._record("gte", *args, **kwargs)
    def in_(self, *args, **kwargs): return self._record("in_", *args, **kwargs)
    def is_(self, *args, **kwargs): return self._record("is_", *args, **kwargs)
    def ilike(self, *args, **kwargs): return self._record("ilike", *args, **kwargs)
    def like(self, *args, **kwargs): return self._record("like", *args, **kwargs)
    def order(self, *args, **kwargs): return self._record("order", *args, **kwargs)
    def limit(self, *args, **kwargs): return self._record("limit", *args, **kwargs)
    def range(self, *args, **kwargs): return self._record("range", *args, **kwargs)
    def maybe_single(self): return self._record("maybe_single")
    def single(self): return self._record("single")

    def execute(self):
        # If the parent FakeTable was configured to raise, do so here so that
        # the production code's try/except branches can be exercised.
        if self._table.execute_raises is not None:
            raise self._table.execute_raises
        data = self._table.execute_data
        # Supabase returns objects that expose .data and .count attrs.
        return SimpleNamespace(data=data, count=self._table.execute_count)


class FakeTable:
    """A configurable per-table handle.

    Tests set `execute_data` (and optionally `execute_count` / `execute_raises`)
    before invoking the code under test. After the call, tests can inspect
    `calls` to verify the fluent chain.
    """

    def __init__(self, name: str):
        self.name = name
        self.calls: list[tuple[str, tuple, dict]] = []
        self.execute_data: object = None
        self.execute_count: object = None
        self.execute_raises: BaseException | None = None

    def _new_query(self) -> FakeQuery:
        return FakeQuery(self)

    # The fluent API starts with one of these; each returns a fresh query.
    def select(self, *args, **kwargs): return self._new_query().select(*args, **kwargs)
    def insert(self, *args, **kwargs): return self._new_query().insert(*args, **kwargs)
    def update(self, *args, **kwargs): return self._new_query().update(*args, **kwargs)
    def upsert(self, *args, **kwargs): return self._new_query().upsert(*args, **kwargs)
    def delete(self, *args, **kwargs): return self._new_query().delete(*args, **kwargs)


class FakeStorageBucket:
    def __init__(self):
        self.uploaded: list[tuple[str, bytes, dict]] = []
        self.removed: list[list[str]] = []
        self.signed_urls: dict[str, str] = {}

    def upload(self, path: str, data: bytes, options=None):
        self.uploaded.append((path, data, options or {}))
        return SimpleNamespace(path=path)

    def remove(self, paths: list[str]):
        self.removed.append(list(paths))
        return SimpleNamespace(data=[{"name": p} for p in paths])

    def create_signed_url(self, path: str, expires_in: int):
        url = self.signed_urls.get(path, f"https://test.supabase.co/storage/v1/object/sign/{path}")
        return {"signedURL": url}


class FakeStorage:
    def __init__(self):
        self.buckets: dict[str, FakeStorageBucket] = {}

    def from_(self, bucket: str) -> FakeStorageBucket:
        return self.buckets.setdefault(bucket, FakeStorageBucket())


class FakeAuthAdmin:
    def __init__(self):
        self.users: list[dict] = []

    def list_users(self):
        return SimpleNamespace(data=list(self.users))

    def get_user_by_id(self, user_id: str):
        for u in self.users:
            if u.get("id") == user_id:
                return SimpleNamespace(user=SimpleNamespace(**u))
        return SimpleNamespace(user=None)

    def update_user_by_id(self, user_id: str, payload: dict):
        for u in self.users:
            if u.get("id") == user_id:
                u.update(payload)
                return SimpleNamespace(user=SimpleNamespace(**u))
        return SimpleNamespace(user=None)


class FakeAuth:
    def __init__(self):
        self.admin = FakeAuthAdmin()


class FakeSupabase:
    def __init__(self):
        self.tables: dict[str, FakeTable] = {}
        self.storage = FakeStorage()
        self.auth = FakeAuth()

    def table(self, name: str) -> FakeTable:
        return self.tables.setdefault(name, FakeTable(name))


@pytest.fixture
def fake_supabase(monkeypatch):
    """Return a FakeSupabase and patch core.db.get_client to return it."""
    fake = FakeSupabase()
    import core.db as db
    monkeypatch.setattr(db, "get_client", lambda: fake)
    # Reset module-level singleton if present
    monkeypatch.setattr(db, "_client", fake, raising=False)
    return fake


# ---- Anthropic fake --------------------------------------------------------

class FakeAnthropicResponse:
    def __init__(self, text: str):
        self.content = [SimpleNamespace(text=text)]


class FakeAnthropicMessages:
    def __init__(self):
        self.create = AsyncMock()
        self.stream = MagicMock()


class FakeAnthropicClient:
    def __init__(self):
        self.messages = FakeAnthropicMessages()


@pytest.fixture
def fake_anthropic(monkeypatch):
    """Patch anthropic.AsyncAnthropic so every LLMService instance built in a
    test uses the same fake messages object. Configure responses by setting:

        fake.messages.create.return_value = FakeAnthropicResponse('{"k":1}')

    or for retries:

        fake.messages.create.side_effect = [Exception("429"), FakeAnthropicResponse(...)]
    """
    fake = FakeAnthropicClient()
    monkeypatch.setattr("anthropic.AsyncAnthropic", lambda **_: fake)
    # Also bust the LLMService singleton so the patched constructor is used.
    import core.llm as llm
    monkeypatch.setattr(llm, "_instance", None)
    return fake


@pytest.fixture
def make_response():
    def _make(text: str) -> FakeAnthropicResponse:
        return FakeAnthropicResponse(text)
    return _make


# ---- Sample data factories -------------------------------------------------

@pytest.fixture
def sample_role():
    return {
        "id": "11111111-1111-1111-1111-111111111111",
        "user_id": "22222222-2222-2222-2222-222222222222",
        "org_id": "33333333-3333-3333-3333-333333333333",
        "title": "Senior Backend Engineer",
        "company_name": "Acme",
        "job_description": "Build scalable APIs in Python.",
        "dimensions": ["judgment_under_ambiguity", "technical_depth"],
        "technical_depth": "application",
        "status": "live",
        "assessment_link_token": "tok_live_123",
        "interview_duration_minutes": 20,
        "custom_instructions": "",
        "interviewer_voice_id": None,
    }


@pytest.fixture
def sample_assessment():
    return {
        "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "role_id": "11111111-1111-1111-1111-111111111111",
        "candidate_user_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "candidate_name": "Jane Candidate",
        "candidate_email": "jane@example.com",
        "cv_url": "https://test.supabase.co/storage/cv.pdf",
        "cv_extracted": {
            "name": "Jane Candidate",
            "email": "jane@example.com",
            "experience_path": "path_a",
            "anchor_points": ["Built a real-time chat backend in Python."],
            "experience": [
                {
                    "company": "PriorCo",
                    "role": "Backend Engineer",
                    "dates": "2020-2024",
                    "description": "Maintained Python services.",
                    "relevant": True,
                }
            ],
            "education": [],
            "skills": ["Python", "FastAPI"],
            "projects": [],
        },
        "status": "in_progress",
    }


@pytest.fixture
def sample_cv_extracted():
    return {
        "name": "Jane Candidate",
        "email": "jane@example.com",
        "experience": [
            {"company": "PriorCo", "role": "Backend Engineer",
             "dates": "2020-2024", "description": "Python services.",
             "relevant": True},
        ],
        "education": [],
        "skills": ["Python"],
        "projects": [],
        "experience_path": "path_a",
        "experience_path_rationale": "Direct backend experience.",
        "anchor_points": ["Built a real-time chat backend in Python."],
    }


@pytest.fixture
def sample_transcript():
    return [
        {"role": "assistant", "content": "Hi Jane, tell me about a recent backend project."},
        {"role": "user", "content": "I built a chat backend handling 10k concurrent users."},
        {"role": "assistant", "content": "What concrete tradeoff did you make on persistence?"},
        {"role": "user", "content": "We chose Postgres over Cassandra to keep ops simple."},
    ]


@pytest.fixture
def sample_dimension_scores():
    return [
        {"dimension": "judgment_under_ambiguity", "score": 4,
         "quotation_basis": "We chose Postgres over Cassandra to keep ops simple.",
         "notes": "Concrete tradeoff articulated."},
        {"dimension": "technical_depth", "score": 3,
         "quotation_basis": "10k concurrent users.",
         "notes": "Reasonable scale claim, no proof of internals."},
    ]


@pytest.fixture
def sample_hirer_report(sample_dimension_scores):
    return {
        "scoring_summary": sample_dimension_scores,
        "top_excerpts": [
            {"excerpt": "We chose Postgres over Cassandra.",
             "why_selected": "Concrete tradeoff.",
             "dimension": "judgment_under_ambiguity",
             "signal_type": "decision"},
        ],
        "capability_map": {
            "demonstrated_depth": ["backend services"],
            "surface_fluency": [],
            "blind_spots": [],
            "requires_expert_verification": [],
            "transfer_capability": "moderate",
        },
        "comprehensive_assessment": {
            "cheating_risk": "low",
            "cheating_signals": [],
            "one_sentence_summary": "Solid backend engineer with concrete tradeoffs.",
        },
        "composite_score": 3.5,
    }


@pytest.fixture
def sample_candidate_report():
    return {
        "summary": "You spoke clearly about a real chat backend.",
        "strengths": ["Concrete examples", "Clear tradeoff articulation"],
        "areas_for_development": ["Go deeper on internals."],
        "overall_impression": "Thoughtful and grounded.",
    }
