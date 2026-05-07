"""Tests for interview.normalize_elevenlabs_messages."""

from datetime import datetime

import pytest

from interview import normalize_elevenlabs_messages


class TestNormalize:
    def test_empty_list(self):
        assert normalize_elevenlabs_messages([]) == []

    def test_none(self):
        assert normalize_elevenlabs_messages(None) == []

    def test_agent_role_mapped_to_assistant(self):
        out = normalize_elevenlabs_messages([
            {"role": "agent", "message": "Hello"},
        ])
        assert len(out) == 1
        assert out[0]["role"] == "assistant"
        assert out[0]["content"] == "Hello"

    def test_assistant_role_passes_through(self):
        out = normalize_elevenlabs_messages([
            {"role": "assistant", "message": "Hi"},
        ])
        assert out[0]["role"] == "assistant"

    def test_user_role_passes_through(self):
        out = normalize_elevenlabs_messages([
            {"role": "user", "message": "I think..."},
        ])
        assert out[0]["role"] == "user"

    def test_unknown_role_defaults_to_user(self):
        out = normalize_elevenlabs_messages([
            {"role": "moderator", "message": "Stop"},
        ])
        assert out[0]["role"] == "user"

    def test_uses_message_field(self):
        out = normalize_elevenlabs_messages([
            {"role": "agent", "message": "from message"},
        ])
        assert out[0]["content"] == "from message"

    def test_falls_back_to_content_field(self):
        out = normalize_elevenlabs_messages([
            {"role": "agent", "content": "from content"},
        ])
        assert out[0]["content"] == "from content"

    def test_strips_whitespace(self):
        out = normalize_elevenlabs_messages([
            {"role": "agent", "message": "  spaced  "},
        ])
        assert out[0]["content"] == "spaced"

    def test_skips_empty_content(self):
        out = normalize_elevenlabs_messages([
            {"role": "agent", "message": ""},
            {"role": "user", "message": "   "},
            {"role": "agent", "message": "real"},
        ])
        assert len(out) == 1
        assert out[0]["content"] == "real"

    def test_attaches_iso_timestamp(self):
        out = normalize_elevenlabs_messages([
            {"role": "user", "message": "x"},
        ])
        ts = out[0]["timestamp"]
        # Round-trip via fromisoformat.
        parsed = datetime.fromisoformat(ts)
        assert parsed.tzinfo is not None

    def test_preserves_ordering(self):
        out = normalize_elevenlabs_messages([
            {"role": "agent", "message": "first"},
            {"role": "user", "message": "second"},
            {"role": "agent", "message": "third"},
        ])
        assert [m["content"] for m in out] == ["first", "second", "third"]
