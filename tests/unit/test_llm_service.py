"""Tests for core.llm.LLMService — async wrapper with retry/backoff."""

import os
from unittest.mock import AsyncMock

import pytest

import core.llm as llm_module
from core.llm import LLMService, get_llm_service


class TestLLMServiceInit:
    def test_raises_when_api_key_missing(self, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        with pytest.raises(ValueError, match="ANTHROPIC_API_KEY"):
            LLMService()

    def test_constructs_with_api_key(self, fake_anthropic):
        svc = LLMService()
        assert svc._client is fake_anthropic


class TestGetLLMServiceSingleton:
    def test_returns_same_instance(self, fake_anthropic):
        a = get_llm_service()
        b = get_llm_service()
        assert a is b


@pytest.mark.asyncio
class TestGenerateJson:
    async def test_happy_path_returns_parsed(self, fake_anthropic, make_response):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response('{"a": 1}'))
        svc = LLMService()
        out = await svc.generate_json("hello")
        assert out == {"a": 1}

    async def test_strips_markdown_fences(self, fake_anthropic, make_response):
        fake_anthropic.messages.create = AsyncMock(
            return_value=make_response('```json\n{"a": 1}\n```'))
        svc = LLMService()
        assert await svc.generate_json("p") == {"a": 1}

    async def test_returns_error_on_parse_failure(self, fake_anthropic, make_response):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response("garbage"))
        svc = LLMService()
        out = await svc.generate_json("p")
        assert out == {"error": "JSON parse failed"}

    async def test_retries_on_429(self, fake_anthropic, make_response, monkeypatch):
        # First two calls raise 429-like errors; third succeeds.
        fake_anthropic.messages.create = AsyncMock(side_effect=[
            Exception("Error 429: rate limit"),
            Exception("Error 429: rate limit"),
            make_response('{"ok": true}'),
        ])
        sleeps = []
        async def fake_sleep(n):
            sleeps.append(n)
        monkeypatch.setattr("asyncio.sleep", fake_sleep)
        svc = LLMService()
        out = await svc.generate_json("p")
        assert out == {"ok": True}
        assert fake_anthropic.messages.create.await_count == 3
        # Exponential backoff: 2, 4 seconds.
        assert sleeps == [2, 4]

    async def test_retries_on_529(self, fake_anthropic, make_response, monkeypatch):
        fake_anthropic.messages.create = AsyncMock(side_effect=[
            Exception("Error 529: overloaded"),
            make_response('{"ok": true}'),
        ])
        monkeypatch.setattr("asyncio.sleep", AsyncMock())
        svc = LLMService()
        assert await svc.generate_json("p") == {"ok": True}

    async def test_retries_on_overloaded_text(self, fake_anthropic, make_response, monkeypatch):
        fake_anthropic.messages.create = AsyncMock(side_effect=[
            Exception("server overloaded"),
            make_response('{"x": 1}'),
        ])
        monkeypatch.setattr("asyncio.sleep", AsyncMock())
        svc = LLMService()
        assert await svc.generate_json("p") == {"x": 1}

    async def test_gives_up_after_three_retries(self, fake_anthropic, monkeypatch):
        fake_anthropic.messages.create = AsyncMock(side_effect=Exception("Error 429"))
        monkeypatch.setattr("asyncio.sleep", AsyncMock())
        svc = LLMService()
        out = await svc.generate_json("p", retries=3)
        assert out == {"error": "llm_error"}
        assert fake_anthropic.messages.create.await_count == 3

    async def test_non_retryable_error_returns_immediately(self, fake_anthropic):
        fake_anthropic.messages.create = AsyncMock(side_effect=ValueError("bad request"))
        svc = LLMService()
        out = await svc.generate_json("p")
        assert out == {"error": "llm_error"}
        assert fake_anthropic.messages.create.await_count == 1

    async def test_passes_system_instruction(self, fake_anthropic, make_response):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response("{}"))
        svc = LLMService()
        await svc.generate_json("p", system_instruction="be helpful")
        kwargs = fake_anthropic.messages.create.call_args.kwargs
        assert "be helpful" in kwargs["system"]
        # Always appends the JSON-only directive.
        assert "JSON" in kwargs["system"]


@pytest.mark.asyncio
class TestGenerateText:
    async def test_returns_text(self, fake_anthropic, make_response):
        fake_anthropic.messages.create = AsyncMock(return_value=make_response("hello world"))
        svc = LLMService()
        out = await svc.generate_text("p")
        assert out == "hello world"

    async def test_empty_response_returns_empty_string(self, fake_anthropic):
        from types import SimpleNamespace
        fake_anthropic.messages.create = AsyncMock(return_value=SimpleNamespace(content=[]))
        svc = LLMService()
        assert await svc.generate_text("p") == ""

    async def test_retries_on_overload(self, fake_anthropic, make_response, monkeypatch):
        fake_anthropic.messages.create = AsyncMock(side_effect=[
            Exception("Error 429"),
            make_response("ok"),
        ])
        monkeypatch.setattr("asyncio.sleep", AsyncMock())
        svc = LLMService()
        assert await svc.generate_text("p") == "ok"

    async def test_returns_empty_on_total_failure(self, fake_anthropic, monkeypatch):
        fake_anthropic.messages.create = AsyncMock(side_effect=Exception("Error 429"))
        monkeypatch.setattr("asyncio.sleep", AsyncMock())
        svc = LLMService()
        assert await svc.generate_text("p", retries=2) == ""


@pytest.mark.asyncio
class TestGenerateStream:
    async def test_yields_text_chunks(self, fake_anthropic):
        # Build an async-context-manager that yields an async iterator of text.
        chunks = ["hel", "lo ", "world"]

        class FakeStreamCM:
            async def __aenter__(self_inner):
                return self_inner
            async def __aexit__(self_inner, *exc):
                return False

            class _AIter:
                def __init__(self, items):
                    self._it = iter(items)
                def __aiter__(self):
                    return self
                async def __anext__(self):
                    try:
                        return next(self._it)
                    except StopIteration:
                        raise StopAsyncIteration

            @property
            def text_stream(self_inner):
                return FakeStreamCM._AIter(chunks)

        fake_anthropic.messages.stream = lambda **kwargs: FakeStreamCM()
        svc = LLMService()
        out = []
        async for tok in svc.generate_stream(messages=[{"role": "user", "content": "hi"}]):
            out.append(tok)
        assert out == chunks

    async def test_passes_cache_control_on_system(self, fake_anthropic):
        captured = {}

        class FakeStreamCM:
            def __init__(self, **kwargs):
                captured.update(kwargs)
            async def __aenter__(self_inner):
                return self_inner
            async def __aexit__(self_inner, *exc):
                return False

            class _AIter:
                def __aiter__(self):
                    return self
                async def __anext__(self):
                    raise StopAsyncIteration

            @property
            def text_stream(self_inner):
                return FakeStreamCM._AIter()

        fake_anthropic.messages.stream = lambda **kwargs: FakeStreamCM(**kwargs)
        svc = LLMService()
        async for _ in svc.generate_stream(messages=[{"role": "user", "content": "x"}], system="big system"):
            pass
        sysmsgs = captured.get("system")
        assert isinstance(sysmsgs, list)
        assert sysmsgs[0]["cache_control"] == {"type": "ephemeral"}
        assert sysmsgs[0]["text"] == "big system"
