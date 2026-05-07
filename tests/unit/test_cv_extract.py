"""Tests for agents.cv_extract — CV extraction (mocked LLM)."""

import json
from unittest.mock import AsyncMock

import pytest

from agents import cv_extract


@pytest.mark.asyncio
class TestExtractCv:
    async def test_returns_parsed_json(self, fake_anthropic, make_response):
        payload = {
            "name": "Jane",
            "email": "jane@example.com",
            "experience": [],
            "education": [],
            "skills": ["Python"],
            "projects": [],
            "experience_path": "path_a",
            "experience_path_rationale": "Direct experience.",
            "anchor_points": ["X"],
        }
        fake_anthropic.messages.create = AsyncMock(
            return_value=make_response(json.dumps(payload)))
        out = await cv_extract.extract_cv("CV body...", "JD body...")
        assert out == payload

    async def test_passes_jd_in_prompt(self, fake_anthropic, make_response):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response("{}"))
        await cv_extract.extract_cv("CV", "Distinctive JD Marker 12345")
        prompt = fake_anthropic.messages.create.call_args.kwargs["messages"][0]["content"]
        assert "Distinctive JD Marker 12345" in prompt

    async def test_passes_cv_in_prompt(self, fake_anthropic, make_response):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response("{}"))
        await cv_extract.extract_cv("Distinctive CV Body 67890", "JD")
        prompt = fake_anthropic.messages.create.call_args.kwargs["messages"][0]["content"]
        assert "Distinctive CV Body 67890" in prompt

    async def test_uses_extract_cv_system_prompt(self, fake_anthropic, make_response):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response("{}"))
        await cv_extract.extract_cv("CV", "JD")
        # The yaml-loaded prompt is non-empty.
        system = fake_anthropic.messages.create.call_args.kwargs["system"]
        assert isinstance(system, str)
        assert len(system) > 0

    async def test_returns_error_dict_on_malformed_json(self, fake_anthropic, make_response):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response("not json at all"))
        out = await cv_extract.extract_cv("CV", "JD")
        assert isinstance(out, dict)
        assert out.get("error") == "JSON parse failed"
