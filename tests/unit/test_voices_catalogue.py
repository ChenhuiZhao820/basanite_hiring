"""Tests for core.voices — interviewer voice catalogue + validator."""

from unittest.mock import patch

import pytest

from core.voices import (
    ALLOWED_VOICE_IDS, VOICES, Voice, catalogue, is_valid_voice, to_dict,
)


class TestCatalogueShape:
    def test_voices_is_nonempty_tuple(self):
        assert isinstance(VOICES, tuple)
        assert len(VOICES) >= 1

    def test_every_voice_is_dataclass(self):
        for v in VOICES:
            assert isinstance(v, Voice)

    def test_allowed_ids_match_voices(self):
        assert ALLOWED_VOICE_IDS == frozenset(v.id for v in VOICES)

    def test_voice_ids_unique(self):
        ids = [v.id for v in VOICES]
        assert len(ids) == len(set(ids))

    def test_every_voice_has_required_fields(self):
        for v in VOICES:
            assert v.id and isinstance(v.id, str)
            assert v.name and isinstance(v.name, str)
            assert v.accent in {"British", "American", "Indian"}
            assert v.gender in {"Female", "Male"}
            assert v.description and isinstance(v.description, str)


class TestToDict:
    def test_includes_sample_url(self):
        v = VOICES[0]
        d = to_dict(v)
        assert d["sample_url"] == f"/voices/{v.id}.mp3"

    def test_keys_match_expected_shape(self):
        d = to_dict(VOICES[0])
        assert set(d.keys()) == {"id", "name", "accent", "gender", "description", "sample_url"}


class TestCatalogueFunction:
    def test_returns_list_of_dicts(self):
        out = catalogue()
        assert isinstance(out, list)
        assert len(out) == len(VOICES)
        for entry in out:
            assert isinstance(entry, dict)

    def test_serialisable(self):
        import json
        json.dumps(catalogue())  # should not raise


class TestIsValidVoice:
    def test_none_is_valid(self):
        assert is_valid_voice(None) is True

    def test_catalogue_id_is_valid(self):
        assert is_valid_voice(VOICES[0].id) is True

    def test_unknown_id_without_org_invalid(self):
        assert is_valid_voice("not-a-voice") is False

    def test_unknown_id_with_org_checks_db(self):
        with patch("core.db.get_org_custom_voice_by_eleven_id", return_value={"id": "x"}):
            assert is_valid_voice("custom-voice", org_id="org-1") is True

    def test_unknown_id_with_org_returns_false_when_db_misses(self):
        with patch("core.db.get_org_custom_voice_by_eleven_id", return_value=None):
            assert is_valid_voice("custom-voice", org_id="org-1") is False
