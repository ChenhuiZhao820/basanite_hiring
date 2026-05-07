"""Tests for core.pdf — pure HTML renderers + render_report_pdf (mocked WeasyPrint)."""

import sys
import types
from unittest.mock import MagicMock

import pytest

from core.pdf import (
    _bullets, _candidate_html, _format_key, _header, _hirer_html,
    render_report_pdf,
)


class TestFormatKey:
    @pytest.mark.parametrize("raw,expected", [
        ("technical_depth", "Technical Depth"),
        ("judgment_under_ambiguity", "Judgment Under Ambiguity"),
        ("a", "A"),
        ("a_b_c", "A B C"),
        ("trailing_", "Trailing"),
        ("_leading", "Leading"),
        ("__double__", "Double"),
    ])
    def test_snake_to_title(self, raw, expected):
        assert _format_key(raw) == expected

    def test_empty_returns_empty(self):
        assert _format_key("") == ""

    def test_none_returns_empty(self):
        assert _format_key(None) == ""

    def test_coerces_non_string(self):
        # Should not raise.
        out = _format_key(123)
        assert isinstance(out, str)


class TestBullets:
    def test_empty_list(self):
        assert _bullets([]) == ""

    def test_none(self):
        assert _bullets(None) == ""

    def test_renders_ul_li(self):
        out = _bullets(["one", "two"])
        assert out.startswith("<ul>")
        assert "<li>one</li>" in out
        assert "<li>two</li>" in out
        assert out.endswith("</ul>")

    def test_filters_empty_strings(self):
        out = _bullets(["", "  ", "real"])
        assert "<li>real</li>" in out
        assert out.count("<li>") == 1

    def test_escapes_html(self):
        out = _bullets(["<script>alert(1)</script>"])
        assert "<script>" not in out
        assert "&lt;script&gt;" in out


class TestHeader:
    def test_includes_kind_and_names(self):
        out = _header("Role X", "Jane", "Hirer")
        assert "Hirer" in out
        assert "Role X" in out
        assert "Jane" in out

    def test_escapes_special_chars(self):
        out = _header("R&D", "<script>", "K")
        assert "<script>" not in out
        assert "&lt;script&gt;" in out


class TestCandidateHtml:
    def test_empty_report_renders_fallback(self):
        out = _candidate_html("Role", "Jane", {})
        assert "No feedback content available." in out

    def test_includes_summary(self):
        out = _candidate_html("Role", "Jane", {"summary": "You did well."})
        assert "You did well." in out

    def test_includes_strengths_and_areas(self):
        out = _candidate_html("Role", "Jane", {
            "strengths": ["Clear examples"],
            "areas_for_development": ["Be more concrete"],
        })
        assert "Clear examples" in out
        assert "Be more concrete" in out

    def test_includes_overall_in_blockquote(self):
        out = _candidate_html("Role", "Jane", {"overall_impression": "Solid."})
        assert "Solid." in out
        assert "<blockquote>Solid.</blockquote>" in out

    def test_escapes_summary(self):
        out = _candidate_html("R", "Jane", {"summary": "<img src=x>"})
        assert "<img src=x>" not in out
        assert "&lt;img" in out


class TestHirerHtml:
    def test_empty_report_renders_fallback(self):
        out = _hirer_html("Role", "Jane", {})
        assert "No report content available." in out

    def test_renders_scoring_summary(self):
        report = {
            "scoring_summary": [
                {"dimension": "technical_depth", "score": 4,
                 "quotation_basis": "I built X.", "notes": "Concrete."},
            ]
        }
        out = _hirer_html("Role", "Jane", report)
        assert "Technical Depth" in out
        assert "4/5" in out
        assert "I built X." in out
        assert "Concrete." in out

    def test_renders_top_excerpts_dict_form(self):
        report = {
            "top_excerpts": [
                {"excerpt": "We chose X over Y.", "why_selected": "Tradeoff."},
            ]
        }
        out = _hirer_html("Role", "Jane", report)
        assert "We chose X over Y." in out
        assert "Tradeoff." in out

    def test_renders_top_excerpts_string_form(self):
        out = _hirer_html("Role", "Jane", {"top_excerpts": ["raw quote"]})
        assert "raw quote" in out

    def test_renders_capability_map(self):
        report = {
            "capability_map": {
                "blind_spots": ["edge case handling"],
                "transfer_capability": "moderate",
            }
        }
        out = _hirer_html("Role", "Jane", report)
        assert "Blind spots" in out
        assert "edge case handling" in out
        assert "Transfer capability" in out
        assert "moderate" in out

    def test_renders_one_liner_summary(self):
        report = {
            "comprehensive_assessment": {"one_sentence_summary": "Solid mid-level."}
        }
        out = _hirer_html("Role", "Jane", report)
        assert "Solid mid-level." in out

    def test_renders_cheating_risk_dict(self):
        report = {
            "comprehensive_assessment": {
                "cheating_risk": {"level": "low", "rationale": "Specific stories."}
            }
        }
        out = _hirer_html("Role", "Jane", report)
        assert "low" in out
        assert "Specific stories." in out

    def test_escapes_quotation_basis(self):
        report = {
            "scoring_summary": [
                {"dimension": "x", "score": 3,
                 "quotation_basis": "<script>x</script>"},
            ]
        }
        out = _hirer_html("R", "J", report)
        assert "<script>x</script>" not in out


class TestRenderReportPdf:
    def _install_fake_weasyprint(self, monkeypatch, calls):
        class FakeHTML:
            def __init__(self, string=None):
                calls.append(string)
            def write_pdf(self):
                return b"%PDF-FAKE"
        fake_module = types.ModuleType("weasyprint")
        fake_module.HTML = FakeHTML
        monkeypatch.setitem(sys.modules, "weasyprint", fake_module)

    def test_hirer_uses_hirer_html(self, monkeypatch):
        captured = []
        self._install_fake_weasyprint(monkeypatch, captured)
        out = render_report_pdf("hirer", "Role", "Jane",
                                {"scoring_summary": [{"dimension": "x", "score": 3}]})
        assert out == b"%PDF-FAKE"
        assert captured and "Dimension scores" in captured[0]

    def test_candidate_uses_candidate_html(self, monkeypatch):
        captured = []
        self._install_fake_weasyprint(monkeypatch, captured)
        out = render_report_pdf("candidate", "Role", "Jane", {"summary": "Nice."})
        assert out == b"%PDF-FAKE"
        assert captured and "Nice." in captured[0]

    def test_unknown_type_treated_as_candidate(self, monkeypatch):
        captured = []
        self._install_fake_weasyprint(monkeypatch, captured)
        render_report_pdf("other", "R", "J", {"summary": "x"})
        assert captured and "Your feedback report" in captured[0]
