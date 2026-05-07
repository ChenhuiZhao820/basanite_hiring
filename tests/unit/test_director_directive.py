"""Tests for interview.director_directive — Opus supervisor pass."""

import json
from unittest.mock import AsyncMock

import pytest

from interview import director_directive


@pytest.fixture
def role():
    return {
        "title": "Backend Engineer",
        "company_name": "Acme",
        "job_description": "Build APIs.",
        "dimensions": ["judgment_under_ambiguity", "technical_depth"],
        "interview_duration_minutes": 20,
        "custom_instructions": "",
    }


@pytest.fixture
def cv():
    return {"anchor_points": ["Built a chat backend."]}


@pytest.mark.asyncio
class TestDirectorDirectiveGuards:
    async def test_returns_none_when_under_three_messages(self, role, cv, fake_anthropic):
        out = await director_directive(role, cv, [{"role": "assistant", "content": "Hi"}], 60)
        assert out is None
        # No LLM call made.
        assert fake_anthropic.messages.create.await_count == 0

    async def test_returns_none_when_no_user_turns(self, role, cv, fake_anthropic):
        msgs = [
            {"role": "assistant", "content": "Hi"},
            {"role": "assistant", "content": "Tell me about X"},
            {"role": "assistant", "content": "Are you there?"},
        ]
        out = await director_directive(role, cv, msgs, 60)
        assert out is None

    async def test_returns_none_when_user_content_empty(self, role, cv, fake_anthropic):
        msgs = [
            {"role": "assistant", "content": "Hi"},
            {"role": "user", "content": "   "},
            {"role": "assistant", "content": "anyone?"},
        ]
        out = await director_directive(role, cv, msgs, 60)
        assert out is None


@pytest.mark.asyncio
class TestDirectorDirectiveSuccess:
    async def test_returns_directive_dict(self, role, cv, fake_anthropic, make_response):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response(
            json.dumps({"directive": "Push on the persistence choice.",
                        "reasoning": "vague answer earlier"})))
        msgs = [
            {"role": "assistant", "content": "Tell me about a backend."},
            {"role": "user", "content": "We used Postgres."},
            {"role": "assistant", "content": "Why?"},
            {"role": "user", "content": "It was simpler."},
        ]
        out = await director_directive(role, cv, msgs, 300)
        assert out == {
            "directive": "Push on the persistence choice.",
            "reasoning": "vague answer earlier",
        }


@pytest.mark.asyncio
class TestDirectorDirectiveSkipPaths:
    async def test_returns_none_on_explicit_null(self, role, cv, fake_anthropic, make_response):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response(
            '{"directive": null, "reasoning": "all good"}'))
        msgs = [
            {"role": "assistant", "content": "x"},
            {"role": "user", "content": "y"},
            {"role": "assistant", "content": "z"},
        ]
        out = await director_directive(role, cv, msgs, 60)
        assert out is None

    async def test_returns_none_on_empty_directive_string(self, role, cv,
                                                          fake_anthropic, make_response):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response(
            '{"directive": "   ", "reasoning": "x"}'))
        msgs = [
            {"role": "assistant", "content": "x"},
            {"role": "user", "content": "y"},
            {"role": "assistant", "content": "z"},
        ]
        out = await director_directive(role, cv, msgs, 60)
        assert out is None

    async def test_returns_none_when_response_has_error_key(self, role, cv,
                                                            fake_anthropic, make_response):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response(
            '{"error": "llm_error", "directive": "x"}'))
        msgs = [
            {"role": "assistant", "content": "x"},
            {"role": "user", "content": "y"},
            {"role": "assistant", "content": "z"},
        ]
        out = await director_directive(role, cv, msgs, 60)
        assert out is None

    async def test_returns_none_on_missing_directive_key(self, role, cv,
                                                         fake_anthropic, make_response):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response(
            '{"reasoning": "x"}'))
        msgs = [
            {"role": "assistant", "content": "x"},
            {"role": "user", "content": "y"},
            {"role": "assistant", "content": "z"},
        ]
        out = await director_directive(role, cv, msgs, 60)
        assert out is None

    async def test_returns_none_on_llm_exception(self, role, cv, fake_anthropic):
        fake_anthropic.messages.create = AsyncMock(side_effect=RuntimeError("boom"))
        msgs = [
            {"role": "assistant", "content": "x"},
            {"role": "user", "content": "y"},
            {"role": "assistant", "content": "z"},
        ]
        # The call into LLMService.generate_json catches errors internally and
        # returns {"error": "llm_error"}, which director_directive treats as a
        # skip; the function should not propagate.
        out = await director_directive(role, cv, msgs, 60)
        assert out is None


@pytest.mark.asyncio
class TestDirectorDirectivePromptShape:
    async def test_includes_role_dimensions_and_elapsed(self, role, cv,
                                                        fake_anthropic, make_response):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response(
            '{"directive": "x", "reasoning": "y"}'))
        msgs = [
            {"role": "assistant", "content": "Tell me about a project."},
            {"role": "user", "content": "Built a chat backend."},
            {"role": "assistant", "content": "Why Postgres?"},
            {"role": "user", "content": "Simpler ops."},
        ]
        await director_directive(role, cv, msgs, 7 * 60)  # 7 min elapsed
        prompt = fake_anthropic.messages.create.call_args.kwargs["messages"][0]["content"]
        assert "Backend Engineer" in prompt
        assert "Acme" in prompt
        assert "20 min" in prompt
        assert "7 min" in prompt
        # Transcript is tagged with CANDIDATE/INTERVIEWER prefixes.
        assert "[CANDIDATE]" in prompt
        assert "[INTERVIEWER]" in prompt
