"""Tests for core.ats_adapters — pure formatting + dispatch."""

import pytest

from core.ats_adapters import (
    AdapterContext, _format_note_body, adapter_ashby, adapter_default,
    adapter_for, adapter_greenhouse, adapter_lever,
)


def _ctx(**overrides) -> AdapterContext:
    base = dict(
        assessment_id="aaaa",
        merge_application_id="merge_app_1",
        merge_candidate_id="merge_cand_1",
        candidate_name="Jane",
        role_title="Engineer",
        overall_score=4.2,
        dimension_scores=[
            {"dimension_key": "technical_depth", "score": 4.0},
            {"dimension_key": "judgment_under_ambiguity", "score": 3.5},
        ],
        summary_text="Strong on tradeoffs.",
        public_report_url="https://example.test/report.pdf",
    )
    base.update(overrides)
    return AdapterContext(**base)


class TestFormatNoteBody:
    def test_includes_candidate_name(self):
        out = _format_note_body(_ctx())
        assert "Jane" in out

    def test_includes_overall_score(self):
        out = _format_note_body(_ctx())
        assert "4.2 / 5.0" in out

    def test_omits_overall_when_none(self):
        out = _format_note_body(_ctx(overall_score=None))
        assert "Overall score" not in out

    def test_includes_dimensions_humanised(self):
        out = _format_note_body(_ctx())
        assert "Technical Depth" in out
        assert "Judgment Under Ambiguity" in out
        assert "4.0" in out
        assert "3.5" in out

    def test_skips_score_none(self):
        ctx = _ctx(dimension_scores=[
            {"dimension_key": "x", "score": None},
            {"dimension_key": "y", "score": 3},
        ])
        out = _format_note_body(ctx)
        assert "Y: 3.0" in out
        assert "X:" not in out  # the None-score dimension was skipped

    def test_handles_non_numeric_score(self):
        ctx = _ctx(dimension_scores=[{"dimension_key": "x", "score": "high"}])
        out = _format_note_body(ctx)
        assert "high" in out

    def test_includes_summary(self):
        out = _format_note_body(_ctx())
        assert "Strong on tradeoffs." in out

    def test_omits_summary_when_empty(self):
        out = _format_note_body(_ctx(summary_text=""))
        assert "Summary:" not in out

    def test_includes_report_url(self):
        out = _format_note_body(_ctx())
        assert "https://example.test/report.pdf" in out


class TestAdapterFor:
    def test_none_returns_default(self):
        assert adapter_for(None) is adapter_default

    def test_unknown_returns_default(self):
        assert adapter_for("workday") is adapter_default

    def test_empty_string_returns_default(self):
        assert adapter_for("") is adapter_default

    @pytest.mark.parametrize("slug,expected", [
        ("greenhouse", adapter_greenhouse),
        ("Greenhouse", adapter_greenhouse),
        ("GREENHOUSE", adapter_greenhouse),
        ("lever", adapter_lever),
        ("ashby", adapter_ashby),
    ])
    def test_known_slugs(self, slug, expected):
        assert adapter_for(slug) is expected
