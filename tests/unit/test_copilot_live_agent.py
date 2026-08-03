"""Copilot live tick agent: saturation merge rules and output validation.

The panel invariants under test:
- saturation never regresses between ticks (evidence doesn't un-happen)
- only the role's selected dimensions appear in the merged map
- unknown saturation values degrade to "none" rather than detonating
- an empty transcript short-circuits without an LLM call
"""

import pytest

import agents.copilot_live as live_mod
from agents.copilot_live import copilot_tick


class _FakeLLM:
    def __init__(self, payload):
        self._payload = payload
        self.calls = []

    async def generate_json(self, prompt, **kwargs):
        self.calls.append((prompt, kwargs))
        return self._payload


def _role(plan_criteria: str = "Strong: names failure modes."):
    return {
        "id": "r1",
        "title": "Senior Backend Engineer",
        "dimensions": ["judgment_under_ambiguity", "technical_depth"],
        "interview_duration_minutes": 30,
        "interview_plan": {
            "dimension_plans": [
                {
                    "dimension": "technical_depth",
                    "evaluation_criteria": plan_criteria,
                    "probing_strategy": "Ask where the design breaks.",
                    "example_questions": ["Where does it fall over?"],
                },
            ],
        },
    }


def _session(prev_saturation=None):
    return {
        "transcript": [
            {"text": "Tell me about a recent project.", "elapsed_seconds": 10},
            {"text": "I built a chat backend handling 10k users.", "elapsed_seconds": 30},
        ],
        "live_state": {"saturation": prev_saturation or {}},
        "brief_pack": None,
    }


@pytest.mark.asyncio
async def test_empty_transcript_short_circuits(monkeypatch):
    llm = _FakeLLM({})
    monkeypatch.setattr(live_mod, "get_llm_service", lambda: llm)
    result = await copilot_tick(_role(), {"transcript": []}, 60)
    assert result["error"] == "empty_transcript"
    assert llm.calls == []


@pytest.mark.asyncio
async def test_saturation_never_regresses(monkeypatch):
    llm = _FakeLLM({
        "saturation": {"judgment_under_ambiguity": "none", "technical_depth": "partial"},
        "probe": None,
        "authenticity_flags": [],
        "pacing": "",
    })
    monkeypatch.setattr(live_mod, "get_llm_service", lambda: llm)
    session = _session(prev_saturation={"judgment_under_ambiguity": "saturated"})
    result = await copilot_tick(_role(), session, 120)
    # Previous "saturated" wins over the new "none".
    assert result["saturation"]["judgment_under_ambiguity"] == "saturated"
    assert result["saturation"]["technical_depth"] == "partial"


@pytest.mark.asyncio
async def test_unselected_dimensions_dropped(monkeypatch):
    llm = _FakeLLM({
        "saturation": {
            "technical_depth": "partial",
            "ethical_reasoning": "saturated",  # not selected on this role
            "made_up_key": "partial",
        },
        "probe": None,
        "authenticity_flags": [],
        "pacing": "",
    })
    monkeypatch.setattr(live_mod, "get_llm_service", lambda: llm)
    result = await copilot_tick(_role(), _session(), 120)
    assert set(result["saturation"].keys()) == {"judgment_under_ambiguity", "technical_depth"}


@pytest.mark.asyncio
async def test_bad_saturation_values_degrade_to_none(monkeypatch):
    llm = _FakeLLM({
        "saturation": {"technical_depth": "VERY_HIGH"},
        "probe": None,
        "authenticity_flags": [],
        "pacing": "",
    })
    monkeypatch.setattr(live_mod, "get_llm_service", lambda: llm)
    result = await copilot_tick(_role(), _session(), 120)
    assert result["saturation"]["technical_depth"] == "none"


@pytest.mark.asyncio
async def test_probe_passes_through(monkeypatch):
    llm = _FakeLLM({
        "saturation": {"judgment_under_ambiguity": "none", "technical_depth": "none"},
        "probe": {
            "dimension": "technical_depth",
            "technique": "Parameter Verification",
            "text": "What was the actual peak concurrency you measured?",
            "reason": "Scale claim arrived without numbers.",
        },
        "authenticity_flags": ["Answer cadence resembled generated text."],
        "pacing": "Move to judgment next.",
    })
    monkeypatch.setattr(live_mod, "get_llm_service", lambda: llm)
    result = await copilot_tick(_role(), _session(), 300)
    assert result["probe"]["technique"] == "Parameter Verification"
    assert result["authenticity_flags"] == ["Answer cadence resembled generated text."]
    assert result["pacing"] == "Move to judgment next."


@pytest.mark.asyncio
async def test_prompt_carries_plan_rubric(monkeypatch):
    llm = _FakeLLM({
        "saturation": {}, "probe": None, "authenticity_flags": [], "pacing": "",
    })
    monkeypatch.setattr(live_mod, "get_llm_service", lambda: llm)
    await copilot_tick(_role(plan_criteria="Strong: cites real latency numbers."), _session(), 60)
    prompt = llm.calls[0][0]
    assert "Strong: cites real latency numbers." in prompt


@pytest.mark.asyncio
async def test_llm_error_sentinel_passes_through(monkeypatch):
    llm = _FakeLLM({"error": "JSON parse failed"})
    monkeypatch.setattr(live_mod, "get_llm_service", lambda: llm)
    result = await copilot_tick(_role(), _session(), 60)
    assert result.get("error")


@pytest.mark.asyncio
async def test_speaker_labels_reach_the_prompt(monkeypatch):
    # Bot-joined sessions carry diarized speaker names on segments; the
    # prompt lines must be prefixed so the model can trust attribution.
    llm = _FakeLLM({"saturation": {}, "probe": None, "authenticity_flags": [], "pacing": ""})
    monkeypatch.setattr(live_mod, "get_llm_service", lambda: llm)
    session = {
        "transcript": [
            {"text": "Walk me through the migration.", "speaker": "Sam Interviewer"},
            {"text": "I led it end to end.", "speaker": "Jane Candidate"},
        ],
        "live_state": {},
        "brief_pack": None,
    }
    await copilot_tick(_role(), session, 60)
    prompt = llm.calls[0][0]
    assert "Sam Interviewer: Walk me through the migration." in prompt
    assert "Jane Candidate: I led it end to end." in prompt
