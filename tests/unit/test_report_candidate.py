"""Tests for agents.report.generate_candidate_report (mocked LLM)."""

import json
from unittest.mock import AsyncMock

import pytest

from agents import report


@pytest.mark.asyncio
class TestGenerateCandidateReport:
    async def test_returns_parsed_payload(self, fake_anthropic, make_response,
                                          sample_candidate_report, sample_role,
                                          sample_cv_extracted, sample_transcript):
        fake_anthropic.messages.create = AsyncMock(
            return_value=make_response(json.dumps(sample_candidate_report)))
        out = await report.generate_candidate_report(
            sample_transcript, sample_role, sample_cv_extracted)
        assert out == sample_candidate_report

    async def test_role_title_and_candidate_in_prompt(self, fake_anthropic, make_response,
                                                      sample_role, sample_cv_extracted,
                                                      sample_transcript):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response("{}"))
        await report.generate_candidate_report(sample_transcript, sample_role,
                                               sample_cv_extracted)
        prompt = fake_anthropic.messages.create.call_args.kwargs["messages"][0]["content"]
        assert sample_role["title"] in prompt
        assert sample_cv_extracted["name"] in prompt

    async def test_prompt_warns_against_revealing_methodology(self, fake_anthropic,
                                                              make_response, sample_role,
                                                              sample_cv_extracted,
                                                              sample_transcript):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response("{}"))
        await report.generate_candidate_report(sample_transcript, sample_role,
                                               sample_cv_extracted)
        prompt = fake_anthropic.messages.create.call_args.kwargs["messages"][0]["content"]
        # The candidate report must not be reverse-engineerable.
        assert "NOT" in prompt
        assert "scoring criteria" in prompt or "evaluation dimensions" in prompt

    async def test_uses_interview_model(self, fake_anthropic, make_response,
                                        sample_role, sample_cv_extracted,
                                        sample_transcript):
        from core.llm import MODEL_INTERVIEW
        fake_anthropic.messages.create = AsyncMock(return_value=make_response("{}"))
        await report.generate_candidate_report(sample_transcript, sample_role,
                                               sample_cv_extracted)
        assert fake_anthropic.messages.create.call_args.kwargs["model"] == MODEL_INTERVIEW
