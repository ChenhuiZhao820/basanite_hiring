"""Tests for agents.dimensions.recommend_dimensions (mocked LLM)."""

import json
from unittest.mock import AsyncMock

import pytest

from agents import dimensions
from agents.dimensions import DIMENSIONS


@pytest.mark.asyncio
class TestRecommendDimensions:
    async def test_returns_parsed_recommendation(self, fake_anthropic, make_response):
        payload = {
            "dimensions": ["judgment_under_ambiguity", "technical_depth"],
            "technical_depth": "application",
            "rationale": {
                "judgment_under_ambiguity": "Decisions under uncertainty.",
                "technical_depth": "Mandatory technical role.",
            },
        }
        fake_anthropic.messages.create = AsyncMock(
            return_value=make_response(json.dumps(payload)))
        out = await dimensions.recommend_dimensions("backend engineer JD")
        assert out == payload

    async def test_recommended_keys_are_in_dimensions(self, fake_anthropic, make_response):
        payload = {
            "dimensions": ["judgment_under_ambiguity", "creative_reframing", "technical_depth"],
            "technical_depth": "application",
            "rationale": {},
        }
        fake_anthropic.messages.create = AsyncMock(
            return_value=make_response(json.dumps(payload)))
        out = await dimensions.recommend_dimensions("JD")
        for key in out["dimensions"]:
            assert key in DIMENSIONS

    async def test_jd_is_in_prompt(self, fake_anthropic, make_response):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response("{}"))
        await dimensions.recommend_dimensions("Distinctive JD Marker XYZ")
        prompt = fake_anthropic.messages.create.call_args.kwargs["messages"][0]["content"]
        assert "Distinctive JD Marker XYZ" in prompt

    async def test_dimension_catalogue_in_prompt(self, fake_anthropic, make_response):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response("{}"))
        await dimensions.recommend_dimensions("JD")
        prompt = fake_anthropic.messages.create.call_args.kwargs["messages"][0]["content"]
        # Every dimension key should be enumerated in the prompt.
        for key in DIMENSIONS:
            assert key in prompt
