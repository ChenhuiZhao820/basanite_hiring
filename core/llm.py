"""
LLM Service — Anthropic Claude wrapper with JSON mode, streaming, and async retry.

Usage:
    from core.llm import get_llm_service

    llm = get_llm_service()
    result = await llm.generate_json(prompt, system_instruction="...")
    text = await llm.generate_text(prompt, system_instruction="...")
    async for chunk in llm.generate_stream(messages, system="..."):
        print(chunk, end="")
"""
import os
import re
import json
import asyncio
from typing import AsyncIterator

import anthropic
from dotenv import load_dotenv

load_dotenv()

MODEL_FAST = "claude-haiku-4-5-20251001"
MODEL_INTERVIEW = "claude-sonnet-4-6"
RETRYABLE_ERRORS = ["429", "529", "overloaded"]
BASE_BACKOFF_SECONDS = 2


def clean_json_text(text: str) -> str:
    """Strip Markdown code fences and extract valid JSON from LLM output."""
    if not text:
        return "{}"

    text = re.sub(r"^```json\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"^```\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"```$", "", text, flags=re.MULTILINE)
    text = text.strip()

    try:
        json.loads(text)
        return text
    except (json.JSONDecodeError, ValueError):
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        return text[start : end + 1]

    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end != -1:
        return text[start : end + 1]

    return text


def _parse_json_response(raw_text: str) -> dict | list:
    cleaned = clean_json_text(raw_text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"error": "JSON parse failed"}


class LLMService:
    """Anthropic Claude async client with JSON mode, streaming, retry, and exponential backoff."""

    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not set in environment.")
        self._client = anthropic.AsyncAnthropic(api_key=api_key)

    async def generate_json(
        self,
        prompt: str,
        *,
        system_instruction: str = None,
        model: str = MODEL_FAST,
        retries: int = 3,
        max_tokens: int = 1024,
    ) -> dict | list:
        system_parts = []
        if system_instruction:
            system_parts.append(system_instruction)
        system_parts.append("You MUST respond with valid JSON only. No markdown, no explanation, just JSON.")
        system = "\n\n".join(system_parts)

        for attempt in range(retries):
            try:
                response = await self._client.messages.create(
                    model=model,
                    system=system,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=max_tokens,
                    temperature=0.2,
                )
                raw = response.content[0].text if response.content else ""
                return _parse_json_response(raw)
            except Exception as e:
                error_str = str(e)
                is_retryable = any(code in error_str for code in RETRYABLE_ERRORS)
                if is_retryable and attempt < retries - 1:
                    wait = (2 ** attempt) * BASE_BACKOFF_SECONDS
                    print(f"  LLM overloaded (attempt {attempt + 1}/{retries}). Retrying in {wait}s...")
                    await asyncio.sleep(wait)
                else:
                    print(f"  LLM error: {error_str}")
                    return {"error": error_str}

        return {"error": "Max retries exceeded."}

    async def generate_text(
        self,
        prompt: str,
        *,
        system_instruction: str = None,
        model: str = MODEL_FAST,
        retries: int = 3,
        max_tokens: int = 4096,
        temperature: float = 0.3,
    ) -> str:
        """Generate a plain text response (no JSON constraint)."""
        for attempt in range(retries):
            try:
                response = await self._client.messages.create(
                    model=model,
                    system=system_instruction or "",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
                return response.content[0].text if response.content else ""
            except Exception as e:
                error_str = str(e)
                is_retryable = any(code in error_str for code in RETRYABLE_ERRORS)
                if is_retryable and attempt < retries - 1:
                    wait = (2 ** attempt) * BASE_BACKOFF_SECONDS
                    print(f"  LLM overloaded (attempt {attempt + 1}/{retries}). Retrying in {wait}s...")
                    await asyncio.sleep(wait)
                else:
                    print(f"  LLM error: {error_str}")
                    return ""
        return ""

    async def generate_stream(
        self,
        messages: list[dict],
        *,
        system: str = "",
        model: str = MODEL_INTERVIEW,
        max_tokens: int = 4096,
        temperature: float = 0.4,
    ) -> AsyncIterator[str]:
        """Stream a response token-by-token. Yields text chunks.

        Uses prompt caching for the system message (marked as ephemeral)
        to avoid re-processing the large interview prompt on each turn.
        """
        # Use cache_control on system message for prompt caching
        system_messages = [
            {
                "type": "text",
                "text": system,
                "cache_control": {"type": "ephemeral"},
            }
        ] if system else []

        async with self._client.messages.stream(
            model=model,
            system=system_messages,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        ) as stream:
            async for text in stream.text_stream:
                yield text


_instance: LLMService | None = None


def get_llm_service() -> LLMService:
    global _instance
    if _instance is None:
        _instance = LLMService()
    return _instance
