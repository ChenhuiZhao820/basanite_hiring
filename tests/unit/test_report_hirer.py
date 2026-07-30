"""Tests for agents.report.generate_hirer_report (mocked LLM)."""

import json
from unittest.mock import AsyncMock

import pytest

from agents import report


@pytest.fixture
def hirer_payload():
    return {
        "scoring_summary": [
            {"dimension": "judgment_under_ambiguity", "score": 4,
             "quotation_basis": "We chose Postgres over Cassandra.",
             "notes": "Concrete tradeoff."},
            {"dimension": "technical_depth", "score": 3,
             "quotation_basis": "Built a chat backend.",
             "notes": "Reasonable depth."},
        ],
        "top_excerpts": [
            {"excerpt": "We chose Postgres", "why_selected": "Tradeoff",
             "dimension": "judgment_under_ambiguity", "signal_type": "decision"},
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
            "one_sentence_summary": "Solid mid-level engineer.",
        },
        "composite_score": 3.5,
    }


@pytest.mark.asyncio
class TestGenerateHirerReport:
    async def test_returns_parsed_payload(self, fake_anthropic, make_response,
                                          hirer_payload, sample_role,
                                          sample_cv_extracted, sample_transcript):
        fake_anthropic.messages.create = AsyncMock(
            return_value=make_response(json.dumps(hirer_payload)))
        out = await report.generate_hirer_report(
            sample_transcript, sample_role, sample_cv_extracted)
        # ENG-25: post-processing stamps `verified` flags on each scoring
        # row and excerpt. Compare ignoring those.
        for row in out["scoring_summary"]:
            row.pop("verified", None)
        for ex in out["top_excerpts"]:
            ex.pop("verified", None)
        # Lynn 2026-06-09: the agent now also stamps a routing
        # `recommendation` derived from composite_score when the model
        # didn't emit one. Strip it for the equality check; the
        # behaviour is covered explicitly by test_derives_recommendation.
        out.pop("recommendation", None)
        out.pop("recommendation_rationale", None)
        # The redesigned hirer report (b1c0a0a) also stamps empty
        # `headline_summary` / `at_a_glance` defaults when the model omits
        # them, so the PDF's executive-summary and at-a-glance sections
        # always have keys to read. Strip them for the equality check.
        out.pop("headline_summary", None)
        out.pop("at_a_glance", None)
        assert out == hirer_payload

    async def test_derives_recommendation_when_model_omits_it(
        self, fake_anthropic, make_response, hirer_payload,
        sample_role, sample_cv_extracted, sample_transcript,
    ):
        # composite_score=3.5 lands in the "recommended" band. The
        # agent should backfill the routing tier so the dashboard and
        # PDF banner always have a value to render.
        fake_anthropic.messages.create = AsyncMock(
            return_value=make_response(json.dumps(hirer_payload)))
        out = await report.generate_hirer_report(
            sample_transcript, sample_role, sample_cv_extracted)
        assert out["recommendation"] == "recommended"

    async def test_preserves_model_emitted_recommendation(
        self, fake_anthropic, make_response, hirer_payload,
        sample_role, sample_cv_extracted, sample_transcript,
    ):
        # When the model emits a tier directly, the fallback must not
        # overwrite it — even if the composite-score band would say
        # something different.
        payload = {**hirer_payload, "recommendation": "strongly_recommended",
                   "recommendation_rationale": "Top of the pile."}
        fake_anthropic.messages.create = AsyncMock(
            return_value=make_response(json.dumps(payload)))
        out = await report.generate_hirer_report(
            sample_transcript, sample_role, sample_cv_extracted)
        assert out["recommendation"] == "strongly_recommended"
        assert out["recommendation_rationale"] == "Top of the pile."

    async def test_scores_in_range(self, fake_anthropic, make_response,
                                   hirer_payload, sample_role,
                                   sample_cv_extracted, sample_transcript):
        fake_anthropic.messages.create = AsyncMock(
            return_value=make_response(json.dumps(hirer_payload)))
        out = await report.generate_hirer_report(
            sample_transcript, sample_role, sample_cv_extracted)
        for s in out["scoring_summary"]:
            assert 1 <= s["score"] <= 5

    async def test_role_title_in_prompt(self, fake_anthropic, make_response,
                                        sample_role, sample_cv_extracted,
                                        sample_transcript):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response("{}"))
        await report.generate_hirer_report(sample_transcript, sample_role,
                                           sample_cv_extracted)
        prompt = fake_anthropic.messages.create.call_args.kwargs["messages"][0]["content"]
        assert sample_role["title"] in prompt

    async def test_transcript_in_prompt_with_role_labels(self, fake_anthropic,
                                                         make_response, sample_role,
                                                         sample_cv_extracted,
                                                         sample_transcript):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response("{}"))
        await report.generate_hirer_report(sample_transcript, sample_role,
                                           sample_cv_extracted)
        prompt = fake_anthropic.messages.create.call_args.kwargs["messages"][0]["content"]
        assert "INTERVIEWER:" in prompt
        assert "CANDIDATE:" in prompt
        assert sample_transcript[0]["content"] in prompt

    async def test_uses_interview_model(self, fake_anthropic, make_response,
                                        sample_role, sample_cv_extracted,
                                        sample_transcript):
        from core.llm import MODEL_INTERVIEW
        fake_anthropic.messages.create = AsyncMock(return_value=make_response("{}"))
        await report.generate_hirer_report(sample_transcript, sample_role,
                                           sample_cv_extracted)
        kwargs = fake_anthropic.messages.create.call_args.kwargs
        assert kwargs["model"] == MODEL_INTERVIEW
