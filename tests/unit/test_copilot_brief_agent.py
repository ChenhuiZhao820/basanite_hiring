"""Copilot brief agent: candidate layer generation over the locked plan."""

import pytest

import agents.copilot_brief as brief_mod
from agents.copilot_brief import generate_copilot_brief


class _FakeLLM:
    def __init__(self, payload):
        self._payload = payload
        self.calls = []

    async def generate_json(self, prompt, **kwargs):
        self.calls.append((prompt, kwargs))
        return self._payload


def _role():
    return {
        "id": "r1",
        "title": "Senior Backend Engineer",
        "dimensions": ["technical_depth"],
        "interview_plan": {
            "overview": "Voice interview probing backend judgment.",
            "dimension_plans": [
                {
                    "dimension": "technical_depth",
                    "focus": "Scaling limits.",
                    "probing_strategy": "Ask where the design breaks.",
                    "evaluation_criteria": "Strong: names failure modes.",
                },
            ],
        },
    }


def _cv():
    return {
        "name": "Jane Candidate",
        "anchor_points": ["Built a real-time chat backend in Python."],
        "experience": [
            {"company": "PriorCo", "role": "Backend Engineer",
             "dates": "2020-2024", "description": "Python services."},
        ],
    }


@pytest.mark.asyncio
async def test_generates_validated_brief(monkeypatch):
    payload = {
        "candidate_summary": "Backend engineer with real-time systems exposure.",
        "dimension_briefs": [
            {
                "dimension": "technical_depth",
                "cv_anchored_angles": ["Ask about the chat backend's scaling ceiling."],
                "claims_to_verify": ["'10k concurrent users' claim."],
            },
        ],
    }
    llm = _FakeLLM(payload)
    monkeypatch.setattr(brief_mod, "get_llm_service", lambda: llm)
    result = await generate_copilot_brief(_role(), _cv())
    assert not result.get("error")
    assert result["candidate_summary"].startswith("Backend engineer")
    assert result["dimension_briefs"][0]["cv_anchored_angles"]
    # The prompt must carry both the locked plan and the CV anchors.
    prompt = llm.calls[0][0]
    assert "Strong: names failure modes." in prompt
    assert "Built a real-time chat backend in Python." in prompt


@pytest.mark.asyncio
async def test_llm_error_sentinel_passes_through(monkeypatch):
    monkeypatch.setattr(brief_mod, "get_llm_service", lambda: _FakeLLM({"error": "JSON parse failed"}))
    result = await generate_copilot_brief(_role(), _cv())
    assert result.get("error")


@pytest.mark.asyncio
async def test_object_shaped_string_lists_coerced(monkeypatch):
    # Anthropic JSON mode frequently emits list-of-objects for string lists;
    # the schema flattens rather than rejects (same policy as cv_extract).
    payload = {
        "candidate_summary": "Summary.",
        "dimension_briefs": [
            {
                "dimension": "technical_depth",
                "cv_anchored_angles": [{"angle": "Ask about scaling", "why": "CV claim"}],
                "claims_to_verify": [],
            },
        ],
    }
    monkeypatch.setattr(brief_mod, "get_llm_service", lambda: _FakeLLM(payload))
    result = await generate_copilot_brief(_role(), _cv())
    assert not result.get("error")
    angles = result["dimension_briefs"][0]["cv_anchored_angles"]
    assert angles and "Ask about scaling" in angles[0]
