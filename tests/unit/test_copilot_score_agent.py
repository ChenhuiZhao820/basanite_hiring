"""Copilot wrap-up scorer: the evidential rule is enforced mechanically.

A proposed score above 3 whose citation can't be substring-verified against
the transcript gets capped at 3 — the "no score above 3 without a citation"
rule from the product doc, applied even if the model misbehaves.
"""

import pytest

import agents.copilot_score as score_mod
from agents.copilot_score import generate_proposed_review, _verify_and_cap


class _FakeLLM:
    def __init__(self, payload):
        self._payload = payload

    async def generate_json(self, prompt, **kwargs):
        return self._payload


def _role():
    return {
        "id": "r1",
        "title": "Senior Backend Engineer",
        "job_description": "Build APIs.",
        "dimensions": ["judgment_under_ambiguity", "technical_depth"],
        "interview_plan": {
            "dimension_plans": [
                {"dimension": "technical_depth", "evaluation_criteria": "Strong: names failure modes."},
            ],
        },
    }


def _session():
    return {
        "transcript": [
            {"text": "Tell me about a tradeoff you made."},
            {"text": "We chose Postgres over Cassandra to keep ops simple."},
        ],
    }


class TestVerifyAndCap:
    def test_unverified_high_score_capped(self):
        review = {
            "proposed_scores": [
                {"dimension": "technical_depth", "score": 5,
                 "quotation_basis": "I invented this quote entirely.", "notes": "Great."},
            ],
        }
        out = _verify_and_cap(review, "We chose Postgres over Cassandra to keep ops simple.")
        row = out["proposed_scores"][0]
        assert row["verified"] is False
        assert row["score"] == 3
        assert "capped" in row["notes"].lower()

    def test_verified_quote_keeps_score(self):
        review = {
            "proposed_scores": [
                {"dimension": "technical_depth", "score": 5,
                 "quotation_basis": "We chose Postgres over Cassandra to keep ops simple.",
                 "notes": "Concrete tradeoff."},
            ],
        }
        out = _verify_and_cap(review, "Earlier text. We chose Postgres over Cassandra to keep ops simple!")
        row = out["proposed_scores"][0]
        assert row["verified"] is True
        assert row["score"] == 5

    def test_low_score_without_quote_untouched(self):
        review = {
            "proposed_scores": [
                {"dimension": "technical_depth", "score": 2,
                 "quotation_basis": "", "notes": "Insufficient evidence gathered."},
            ],
        }
        out = _verify_and_cap(review, "anything at all")
        row = out["proposed_scores"][0]
        assert row["verified"] is False
        assert row["score"] == 2


@pytest.mark.asyncio
async def test_empty_transcript_short_circuits():
    result = await generate_proposed_review(_role(), {"transcript": []}, {})
    assert result["error"] == "empty_transcript"


@pytest.mark.asyncio
async def test_scores_filtered_to_selected_dimensions(monkeypatch):
    payload = {
        "proposed_scores": [
            {"dimension": "technical_depth", "score": 4,
             "quotation_basis": "We chose Postgres over Cassandra to keep ops simple.",
             "notes": "Concrete."},
            {"dimension": "ethical_reasoning", "score": 5,
             "quotation_basis": "irrelevant", "notes": "not selected"},
        ],
        "synthesis": "Grounded, pragmatic engineer.",
    }
    monkeypatch.setattr(score_mod, "get_llm_service", lambda: _FakeLLM(payload))
    result = await generate_proposed_review(_role(), _session(), {"name": "Jane"})
    dims = [r["dimension"] for r in result["proposed_scores"]]
    assert dims == ["technical_depth"]
    assert result["proposed_scores"][0]["verified"] is True
    assert result["synthesis"] == "Grounded, pragmatic engineer."


@pytest.mark.asyncio
async def test_llm_error_sentinel_passes_through(monkeypatch):
    monkeypatch.setattr(score_mod, "get_llm_service", lambda: _FakeLLM({"error": "JSON parse failed"}))
    result = await generate_proposed_review(_role(), _session(), {})
    assert result.get("error")


@pytest.mark.asyncio
async def test_quote_verification_ignores_speaker_prefixes(monkeypatch):
    # Diarized (bot-join) segments carry speaker names; a citation quoting
    # the bare utterance must still verify even though the prompt line was
    # "Jane Candidate: ...".
    payload = {
        "proposed_scores": [
            {"dimension": "technical_depth", "score": 4,
             "quotation_basis": "We chose Postgres over Cassandra to keep ops simple.",
             "notes": "Concrete."},
        ],
        "synthesis": "Grounded.",
    }
    monkeypatch.setattr(score_mod, "get_llm_service", lambda: _FakeLLM(payload))
    session = {
        "transcript": [
            {"text": "Tell me about a tradeoff you made.", "speaker": "Sam Interviewer"},
            {"text": "We chose Postgres over Cassandra to keep ops simple.",
             "speaker": "Jane Candidate"},
        ],
    }
    result = await generate_proposed_review(_role(), session, {"name": "Jane"})
    row = result["proposed_scores"][0]
    assert row["verified"] is True
    assert row["score"] == 4
