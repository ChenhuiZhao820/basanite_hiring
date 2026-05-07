"""Tests for core.llm.clean_json_text and _parse_json_response.

Pure helpers — no Anthropic client involved.
"""

import json

from core.llm import clean_json_text, _parse_json_response


class TestCleanJsonText:
    def test_empty_returns_empty_object(self):
        assert clean_json_text("") == "{}"

    def test_none_returns_empty_object(self):
        assert clean_json_text(None) == "{}"

    def test_already_valid_json_unchanged(self):
        assert clean_json_text('{"a": 1}') == '{"a": 1}'

    def test_strips_json_fence(self):
        out = clean_json_text("```json\n{\"a\": 1}\n```")
        assert json.loads(out) == {"a": 1}

    def test_strips_bare_fence(self):
        out = clean_json_text("```\n{\"a\": 1}\n```")
        assert json.loads(out) == {"a": 1}

    def test_extracts_object_from_prose(self):
        text = 'Here is the result: {"a": 1, "b": 2} please use it.'
        out = clean_json_text(text)
        assert json.loads(out) == {"a": 1, "b": 2}

    def test_extracts_array_from_prose(self):
        text = "Result: [1, 2, 3] thanks"
        out = clean_json_text(text)
        assert json.loads(out) == [1, 2, 3]

    def test_handles_nested_objects(self):
        text = '```json\n{"outer": {"inner": [1, 2]}}\n```'
        out = clean_json_text(text)
        assert json.loads(out) == {"outer": {"inner": [1, 2]}}

    def test_returns_text_when_no_json_found(self):
        # When neither braces nor brackets are present, the original text
        # is returned (callers see the unparseable string and decide).
        out = clean_json_text("not json at all")
        assert out == "not json at all"


class TestParseJsonResponse:
    def test_returns_dict_for_valid_object(self):
        assert _parse_json_response('{"a": 1}') == {"a": 1}

    def test_returns_list_for_valid_array(self):
        assert _parse_json_response("[1, 2, 3]") == [1, 2, 3]

    def test_returns_error_dict_for_garbage(self):
        out = _parse_json_response("definitely not json")
        assert out == {"error": "JSON parse failed"}

    def test_handles_fenced_response(self):
        out = _parse_json_response("```json\n{\"x\": 9}\n```")
        assert out == {"x": 9}

    def test_handles_empty_input(self):
        # clean_json_text returns "{}" for empty, which is valid JSON
        assert _parse_json_response("") == {}
