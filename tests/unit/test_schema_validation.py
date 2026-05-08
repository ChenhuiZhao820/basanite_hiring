"""ENG-21: Pydantic validation of LLM JSON outputs.

Each JSON-emitting agent now wraps its raw LLM output through
core.schemas.validate_or_error(...). Tests confirm:
- valid output passes through (with default-filled missing fields)
- malformed output → {"error": "schema_validation_failed", ...}
- upstream parse-error sentinel from core.llm passes through unchanged
"""

import json
from unittest.mock import AsyncMock

import pytest

from agents import cv_extract, dimensions, report
from core.schemas import (
    CvExtracted,
    DimensionRecommendation,
    HirerReport,
    CandidateReport,
    DirectorDirective,
    validate_or_error,
)


class TestValidateOrError:
    def test_passes_through_validated_dict(self):
        out = validate_or_error(
            {"name": "Jane", "email": "j@e.com", "experience_path": "path_a"},
            CvExtracted,
        )
        assert out["name"] == "Jane"
        assert out["experience_path"] == "path_a"
        # Defaults filled in for omitted lists.
        assert out["experience"] == []
        assert "error" not in out

    def test_returns_error_for_non_dict(self):
        out = validate_or_error("not a dict", CvExtracted)
        assert out["error"] == "schema_validation_failed"
        assert out["code"] == "not_a_dict"

    def test_returns_error_for_list(self):
        out = validate_or_error(["a", "b"], CvExtracted)
        assert out["error"] == "schema_validation_failed"

    def test_returns_error_for_bad_enum(self):
        out = validate_or_error(
            {"name": "Jane", "experience_path": "path_q"},  # not path_a or path_b
            CvExtracted,
        )
        assert out["error"] == "schema_validation_failed"
        assert out["code"] == "shape_mismatch"

    def test_returns_error_for_score_out_of_range(self):
        out = validate_or_error(
            {"scoring_summary": [
                {"dimension": "x", "score": 99, "quotation_basis": "...", "notes": ""}
            ]},
            HirerReport,
        )
        assert out["error"] == "schema_validation_failed"

    def test_returns_error_for_negative_composite_score(self):
        out = validate_or_error({"composite_score": -1}, HirerReport)
        assert out["error"] == "schema_validation_failed"

    def test_passes_through_upstream_error_sentinel(self):
        # core.llm.generate_json returns this on parse failure; the schema
        # validator must not double-wrap it.
        upstream = {"error": "JSON parse failed"}
        out = validate_or_error(upstream, CvExtracted)
        assert out == upstream

    def test_passes_through_upstream_error_via_llm_error(self):
        upstream = {"error": "llm_error"}
        out = validate_or_error(upstream, CvExtracted)
        assert out == upstream

    def test_director_with_error_and_directive_keeps_both(self):
        # The Director protocol uses both keys legitimately in some edge
        # cases; the validator passes through if both are present (it's
        # treated as a real payload, not an upstream error).
        raw = {"error": "skip_low_signal", "directive": "wrap_now", "reasoning": "x"}
        out = validate_or_error(raw, DirectorDirective)
        # Real validation runs — directive is "wrap_now" and reasoning is "x".
        assert out["directive"] == "wrap_now"
        assert out["reasoning"] == "x"

    def test_extra_fields_are_ignored_not_rejected(self):
        out = validate_or_error(
            {"name": "Jane", "experience_path": "path_a", "_thoughts": "noise"},
            CvExtracted,
        )
        assert "error" not in out
        assert out["name"] == "Jane"

    def test_error_details_capped_at_five(self):
        # Many bad fields → details list truncated to keep logs compact.
        bad = {
            "scoring_summary": [
                {"dimension": "a", "score": 99, "quotation_basis": 1, "notes": []},
                {"dimension": 2, "score": "x", "quotation_basis": [], "notes": ""},
                {"dimension": "b", "score": -5, "quotation_basis": "ok", "notes": ""},
            ],
            "composite_score": "not a number",
        }
        out = validate_or_error(bad, HirerReport)
        assert out["error"] == "schema_validation_failed"
        assert isinstance(out["details"], list)
        assert len(out["details"]) <= 5


@pytest.mark.asyncio
class TestCvExtractValidation:
    async def test_malformed_llm_output_returns_error(self, fake_anthropic, make_response):
        # LLM returns wrong type for experience_path.
        bad_payload = {"name": "Jane", "experience_path": "invalid_path_value"}
        fake_anthropic.messages.create = AsyncMock(
            return_value=make_response(json.dumps(bad_payload)))
        out = await cv_extract.extract_cv("CV", "JD")
        assert out["error"] == "schema_validation_failed"

    async def test_valid_llm_output_returns_dict_with_defaults(self, fake_anthropic, make_response):
        partial = {"name": "Jane", "experience_path": "path_a"}
        fake_anthropic.messages.create = AsyncMock(
            return_value=make_response(json.dumps(partial)))
        out = await cv_extract.extract_cv("CV", "JD")
        assert out["name"] == "Jane"
        assert out["experience"] == []
        assert "error" not in out


@pytest.mark.asyncio
class TestDimensionsValidation:
    async def test_malformed_technical_depth_returns_error(self, fake_anthropic, make_response):
        bad = {"dimensions": ["x"], "technical_depth": "wrong_value"}
        fake_anthropic.messages.create = AsyncMock(
            return_value=make_response(json.dumps(bad)))
        out = await dimensions.recommend_dimensions("JD")
        assert out["error"] == "schema_validation_failed"


@pytest.mark.asyncio
class TestReportHirerValidation:
    async def test_score_out_of_range_returns_error(self, fake_anthropic, make_response,
                                                    sample_role, sample_cv_extracted,
                                                    sample_transcript):
        bad = {
            "scoring_summary": [
                {"dimension": "x", "score": 100, "quotation_basis": "y", "notes": ""}
            ],
            "composite_score": 4,
        }
        fake_anthropic.messages.create = AsyncMock(
            return_value=make_response(json.dumps(bad)))
        out = await report.generate_hirer_report(sample_transcript, sample_role, sample_cv_extracted)
        assert out["error"] == "schema_validation_failed"

    async def test_invalid_cheating_risk_returns_error(self, fake_anthropic, make_response,
                                                       sample_role, sample_cv_extracted,
                                                       sample_transcript):
        bad = {
            "scoring_summary": [],
            "comprehensive_assessment": {"cheating_risk": "extreme", "cheating_signals": [],
                                          "one_sentence_summary": "x"},
        }
        fake_anthropic.messages.create = AsyncMock(
            return_value=make_response(json.dumps(bad)))
        out = await report.generate_hirer_report(sample_transcript, sample_role, sample_cv_extracted)
        assert out["error"] == "schema_validation_failed"


@pytest.mark.asyncio
class TestReportCandidateValidation:
    async def test_strengths_must_be_list(self, fake_anthropic, make_response,
                                          sample_role, sample_cv_extracted,
                                          sample_transcript):
        bad = {"summary": "ok", "strengths": "not a list",
                "areas_for_development": [], "overall_impression": "ok"}
        fake_anthropic.messages.create = AsyncMock(
            return_value=make_response(json.dumps(bad)))
        out = await report.generate_candidate_report(sample_transcript, sample_role, sample_cv_extracted)
        assert out["error"] == "schema_validation_failed"

    async def test_valid_candidate_report_returns_dict(self, fake_anthropic, make_response,
                                                       sample_role, sample_cv_extracted,
                                                       sample_transcript):
        good = {"summary": "ok", "strengths": ["a"],
                 "areas_for_development": ["b"], "overall_impression": "c"}
        fake_anthropic.messages.create = AsyncMock(
            return_value=make_response(json.dumps(good)))
        out = await report.generate_candidate_report(sample_transcript, sample_role, sample_cv_extracted)
        assert out["summary"] == "ok"
        assert out["strengths"] == ["a"]
        assert "error" not in out
