"""ENG-26: candidate report redacts dimension / rubric / path markers
to prevent reverse-engineering of the assessment design."""

import json
from unittest.mock import AsyncMock

import pytest

from agents import report


@pytest.fixture
def role_min():
    return {"title": "Backend Engineer", "dimensions": [],
            "interview_duration_minutes": 20}


@pytest.fixture
def cv_min():
    return {"name": "Jane", "experience_path": "path_a", "anchor_points": []}


@pytest.fixture
def transcript_min():
    return [
        {"role": "assistant", "content": "Hi"},
        {"role": "user", "content": "We discussed Postgres tradeoffs."},
    ]


@pytest.mark.asyncio
class TestCandidateReportRedaction:
    async def _run(self, fake_anthropic, make_response, payload,
                   transcript, role, cv):
        fake_anthropic.messages.create = AsyncMock(
            return_value=make_response(json.dumps(payload)))
        return await report.generate_candidate_report(transcript, role, cv)

    async def test_dimension_name_redacted(self, fake_anthropic, make_response,
                                           transcript_min, role_min, cv_min):
        payload = {
            "summary": "You demonstrated strong judgment under ambiguity.",
            "strengths": ["technical depth", "ethical reasoning"],
            "areas_for_development": ["psychological safety"],
            "overall_impression": "Solid across dimensions.",
        }
        out = await self._run(fake_anthropic, make_response, payload,
                              transcript_min, role_min, cv_min)
        # Dimension keywords should be redacted in every text field.
        assert "judgment under ambiguity" not in out["summary"].lower()
        assert "[redacted]" in out["summary"]
        assert all("[redacted]" in s.lower() or "depth" not in s.lower()
                   for s in out["strengths"])
        assert "psychological safety" not in " ".join(out["areas_for_development"]).lower()

    async def test_dimension_key_underscored_redacted(self, fake_anthropic, make_response,
                                                      transcript_min, role_min, cv_min):
        payload = {
            "summary": "Notes: judgment_under_ambiguity = strong.",
            "strengths": [], "areas_for_development": [],
            "overall_impression": "ok",
        }
        out = await self._run(fake_anthropic, make_response, payload,
                              transcript_min, role_min, cv_min)
        assert "judgment_under_ambiguity" not in out["summary"]
        assert "[redacted]" in out["summary"]

    async def test_path_label_redacted(self, fake_anthropic, make_response,
                                       transcript_min, role_min, cv_min):
        payload = {
            "summary": "Following the path A structure, you...",
            "strengths": [], "areas_for_development": [],
            "overall_impression": "ok",
        }
        out = await self._run(fake_anthropic, make_response, payload,
                              transcript_min, role_min, cv_min)
        # "path A" should be redacted.
        assert "path a" not in out["summary"].lower()

    async def test_rubric_language_redacted(self, fake_anthropic, make_response,
                                            transcript_min, role_min, cv_min):
        payload = {
            "summary": "Your composite score reflects the cheating risk profile.",
            "strengths": [], "areas_for_development": [],
            "overall_impression": "ok",
        }
        out = await self._run(fake_anthropic, make_response, payload,
                              transcript_min, role_min, cv_min)
        assert "composite score" not in out["summary"].lower()
        assert "cheating risk" not in out["summary"].lower()
        # Both should be redacted (two replacements).
        assert out["summary"].count("[redacted]") >= 2

    async def test_director_supervisor_redacted(self, fake_anthropic, make_response,
                                                transcript_min, role_min, cv_min):
        payload = {
            "summary": "The Director nudged the interviewer toward depth.",
            "strengths": [], "areas_for_development": [],
            "overall_impression": "ok",
        }
        out = await self._run(fake_anthropic, make_response, payload,
                              transcript_min, role_min, cv_min)
        assert "director" not in out["summary"].lower()

    async def test_benign_language_passes_through(self, fake_anthropic, make_response,
                                                  transcript_min, role_min, cv_min):
        payload = {
            "summary": "You demonstrated strong communication and engineering judgement on the database choice.",
            "strengths": ["clear technical reasoning about Postgres tradeoffs"],
            "areas_for_development": ["consider exploring distributed systems further"],
            "overall_impression": "An engaging conversation.",
        }
        out = await self._run(fake_anthropic, make_response, payload,
                              transcript_min, role_min, cv_min)
        # Nothing on the blacklist appears, so no redactions.
        assert "[redacted]" not in out["summary"]
        assert "[redacted]" not in " ".join(out["strengths"])
        assert "[redacted]" not in " ".join(out["areas_for_development"])
        assert "[redacted]" not in out["overall_impression"]

    async def test_yaml_prompt_carries_dont_list(self, fake_anthropic, make_response,
                                                 transcript_min, role_min, cv_min):
        """The system prompt sent to the LLM must include the explicit
        do-not list. (Defence in depth alongside the redactor.)"""
        payload = {"summary": "ok", "strengths": [], "areas_for_development": [],
                   "overall_impression": "ok"}
        await self._run(fake_anthropic, make_response, payload,
                        transcript_min, role_min, cv_min)
        system = fake_anthropic.messages.create.call_args.kwargs["system"]
        # System prompt loads from yaml; assert key markers from the new
        # do-not list are present in the system instruction sent to the LLM.
        assert "Do NOT name" in system
        assert "judgment under ambiguity" in system
        assert "composite score" in system
