"""Tests for core.pdf — pure HTML renderers + render_report_pdf (mocked WeasyPrint)."""

import sys
import types
from unittest.mock import MagicMock, patch

import pytest

from core.pdf import (
    _bullets, _candidate_html, _format_key, _header, _hirer_html,
    extract_pdf_text, render_report_pdf,
)


class _FakePage:
    def __init__(self, text):
        self._text = text

    def extract_text(self):
        return self._text


class _FakeReader:
    def __init__(self, *_args, pages=None, **_kwargs):
        self.pages = pages or []


class TestExtractPdfText:
    """ENG-35: bounded extractor for compression-bomb defence."""

    def _patch(self, pages):
        return patch(
            "pypdf.PdfReader",
            lambda *a, **kw: _FakeReader(pages=[_FakePage(p) for p in pages]),
        )

    def test_concatenates_page_text_with_blank_line(self):
        with self._patch(["alpha", "beta"]):
            assert extract_pdf_text(b"%PDF-fake") == "alpha\n\nbeta"

    def test_skips_pages_that_raise(self):
        class BadPage:
            def extract_text(self):
                raise RuntimeError("malformed")
        good = _FakePage("good")
        with patch("pypdf.PdfReader", lambda *a, **kw: _FakeReader(pages=[BadPage(), good])):
            assert extract_pdf_text(b"%PDF-fake") == "good"

    def test_returns_empty_when_all_pages_blank(self):
        with self._patch(["", None, "   "]):
            assert extract_pdf_text(b"%PDF-fake") == ""

    def test_caps_total_chars(self):
        # Each page is well under the per-page cap but together they'd
        # exceed the total. Verify the total cap halts extraction.
        pages = ["B" * 30_000, "C" * 30_000, "D" * 30_000]
        with self._patch(pages):
            out = extract_pdf_text(b"%PDF-fake", max_chars=50_000, page_max_chars=50_000)
            assert len(out) <= 50_000
            # Third page never processed — its marker char is absent.
            assert "D" not in out

    def test_per_page_truncation(self):
        # One huge page, 1M chars. Per-page cap should dominate.
        with self._patch(["X" * 1_000_000]):
            out = extract_pdf_text(b"%PDF-fake")
            # Per-page cap is 50K by default.
            assert len(out) <= 50_000


class TestExtractPdfTextFallback:
    """The pypdf-then-pdfminer cascade. pypdf silently mis-handles a
    long tail of real CV PDFs (LaTeX, Pages, custom font encodings);
    pdfminer.six is the second-chance extractor for those.
    """

    def _fake_miner(self, payload):
        """Install a fake pdfminer.high_level.extract_text_to_fp that
        writes ``payload`` into the caller's buffer. Returns the patch
        context manager."""
        def _impl(_in, out, **_kw):
            out.write(payload)
        from unittest.mock import patch
        return patch("pdfminer.high_level.extract_text_to_fp", _impl)

    def test_uses_pdfminer_when_pypdf_raises(self):
        class _Boom:
            def __init__(self, *a, **kw):
                raise RuntimeError("pypdf cannot parse this file")
        miner_text = "Senior engineer with experience in distributed systems. " * 5
        with patch("pypdf.PdfReader", _Boom), self._fake_miner(miner_text):
            out = extract_pdf_text(b"%PDF-fake")
            assert "distributed systems" in out
            assert len(out) >= 80

    def test_uses_pdfminer_when_pypdf_returns_nothing(self):
        # The common failure mode in the wild: pypdf opens the file
        # fine but pulls back empty pages because the font encoding
        # isn't recoverable. We should still rescue the CV.
        miner_text = "Curriculum Vitae. Built and shipped X. Led the Y team. " * 4
        with patch("pypdf.PdfReader", lambda *a, **kw: _FakeReader(pages=[_FakePage("")])), \
             self._fake_miner(miner_text):
            out = extract_pdf_text(b"%PDF-fake")
            assert "Curriculum Vitae" in out

    def test_uses_pdfminer_when_pypdf_returns_trivial(self):
        # Pypdf sometimes returns a handful of garbled chars (page
        # numbers, single-glyph headers) that satisfy "non-empty" but
        # carry no real signal. Anything under the 80-char minimum
        # should trigger the fallback.
        miner_text = "Full CV body, ten years of backend Python. " * 3
        with patch("pypdf.PdfReader", lambda *a, **kw: _FakeReader(pages=[_FakePage("p.1")])), \
             self._fake_miner(miner_text):
            out = extract_pdf_text(b"%PDF-fake")
            assert "ten years of backend Python" in out

    def test_prefers_pypdf_output_when_it_is_good(self):
        # If pypdf already gives us plenty of text, don't bother with
        # the slower fallback even if pdfminer would yield more.
        miner_text = "Z" * 5_000
        with patch(
            "pypdf.PdfReader",
            lambda *a, **kw: _FakeReader(pages=[_FakePage("A" * 200)]),
        ), self._fake_miner(miner_text):
            out = extract_pdf_text(b"%PDF-fake")
            assert "A" * 200 in out
            assert "Z" not in out

    def test_returns_empty_when_both_paths_yield_nothing(self):
        # Truly unreadable: pypdf opens but every page is blank, and
        # pdfminer returns the empty string. Caller surfaces the
        # "paste the text instead" message; we must not raise.
        with patch("pypdf.PdfReader", lambda *a, **kw: _FakeReader(pages=[_FakePage("")])), \
             self._fake_miner(""):
            assert extract_pdf_text(b"%PDF-fake") == ""

    def test_returns_pypdf_partial_when_miner_unavailable(self):
        # Defensive: if pdfminer isn't importable in some environment,
        # we should still return whatever pypdf managed to scrape so
        # the candidate isn't stranded.
        import sys
        from unittest.mock import patch as _patch
        # Make any pdfminer.* import raise ImportError so the fallback
        # gracefully returns "" without bringing the whole call down.
        real_import = __builtins__["__import__"] if isinstance(__builtins__, dict) else __builtins__.__import__
        def _stub_import(name, *a, **kw):
            if name.startswith("pdfminer"):
                raise ImportError("pdfminer not installed")
            return real_import(name, *a, **kw)
        with patch("pypdf.PdfReader", lambda *a, **kw: _FakeReader(pages=[_FakePage("short")])), \
             _patch.dict(sys.modules, {}, clear=False), \
             _patch("builtins.__import__", _stub_import):
            out = extract_pdf_text(b"%PDF-fake")
            assert out == "short"


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


class TestHirerHtmlRecommendation:
    """Lynn 2026-06-09: hirer report must lead with the routing call,
    then the dimension chart, then the per-dimension cards. The model
    emits `recommendation` explicitly; legacy reports without it fall
    back to a composite-score derivation."""

    def test_renders_explicit_recommendation_label(self):
        report = {
            "recommendation": "strongly_recommended",
            "recommendation_rationale": "Sustained signal across every priority dimension.",
            "composite_score": 4.6,
        }
        out = _hirer_html("Role", "Jane", report)
        assert "Strongly recommended for next round" in out
        assert "Sustained signal across every priority dimension." in out
        # Composite renders alongside the tier.
        assert "4.6" in out

    def test_derives_recommendation_for_legacy_report(self):
        # No `recommendation` field; the banner must derive one from
        # the composite score so older reports still get the headline.
        report = {"composite_score": 2.2}
        out = _hirer_html("Role", "Jane", report)
        assert "Not recommended for next round" in out

    def test_recommendation_appears_before_dimension_detail(self):
        report = {
            "recommendation": "recommended",
            "recommendation_rationale": "Strong on priority dims; one area to probe.",
            "scoring_summary": [
                {"dimension": "technical_depth", "score": 4,
                 "quotation_basis": "I built X.", "notes": "Concrete."},
            ],
            "composite_score": 3.8,
        }
        out = _hirer_html("Role", "Jane", report)
        # The headline tier must appear before the dimension-scores
        # section, mirroring the hierarchy Lynn asked for.
        reco_at = out.index("Recommended for next round")
        scores_at = out.index("Dimension scores")
        assert reco_at < scores_at

    def test_falls_back_to_one_sentence_when_rationale_missing(self):
        # Legacy reports won't have `recommendation_rationale` yet.
        # The comprehensive_assessment one-liner stands in so the
        # banner is never bare.
        report = {
            "composite_score": 3.6,
            "comprehensive_assessment": {"one_sentence_summary": "Pragmatic builder."},
        }
        out = _hirer_html("Role", "Jane", report)
        assert "Pragmatic builder." in out
        # And the one-liner still also renders below the spider as
        # the existing blockquote — keeping the regression assertion
        # in test_renders_one_liner_summary alive.

    def test_empty_report_still_falls_back(self):
        # A `{}` report has no recommendation AND no composite_score,
        # so the banner is suppressed and the page-bottom "no content"
        # fallback path keeps firing as it did before.
        out = _hirer_html("Role", "Jane", {})
        assert "No report content available." in out
        assert "Routing recommendation" not in out

    def test_escapes_rationale(self):
        report = {
            "recommendation": "can_progress",
            "recommendation_rationale": "<script>alert(1)</script>",
            "composite_score": 3.0,
        }
        out = _hirer_html("R", "J", report)
        assert "<script>alert(1)</script>" not in out
        assert "&lt;script&gt;" in out


class TestSpiderSvg:
    """The inline radar chart shipped inside the hirer PDF. Same shape
    as the React `ScoreSpider` so PDF and web view never disagree."""

    def test_renders_when_three_or_more_scored_rows(self):
        from core.pdf import _spider_svg
        rows = [
            {"dimension": "technical_depth", "score": 4},
            {"dimension": "tacit_knowledge", "score": 3},
            {"dimension": "ethical_reasoning", "score": 5},
        ]
        svg = _spider_svg(rows)
        assert svg.startswith("<svg")
        # Axis labels are rendered via _format_key so the human form
        # of the dimension key shows up.
        assert "Technical Depth" in svg
        assert "Tacit Knowledge" in svg
        assert "Ethical Reasoning" in svg

    def test_suppressed_below_three_rows(self):
        from core.pdf import _spider_svg
        assert _spider_svg([
            {"dimension": "a", "score": 4},
            {"dimension": "b", "score": 3},
        ]) == ""

    def test_ignores_unscored_or_zero_rows(self):
        from core.pdf import _spider_svg
        rows = [
            {"dimension": "a", "score": 4},
            {"dimension": "b", "score": 0},
            {"dimension": "c", "score": None},
            {"dimension": "d", "score": 3},
        ]
        # Only two usable rows after filtering — chart is suppressed.
        assert _spider_svg(rows) == ""

    def test_escapes_label(self):
        from core.pdf import _spider_svg
        rows = [
            {"dimension": "<bad>", "score": 4},
            {"dimension": "ok_b", "score": 3},
            {"dimension": "ok_c", "score": 5},
        ]
        svg = _spider_svg(rows)
        assert "<bad>" not in svg
        assert "&lt;bad&gt;" in svg


class TestDeriveRecommendation:
    """Bands in the PDF helper must agree with core.schemas exactly so
    the dashboard banner and the PDF banner show the same tier for the
    same composite score."""

    def test_bands(self):
        from core.pdf import _derive_recommendation_pdf
        assert _derive_recommendation_pdf(4.6) == "strongly_recommended"
        assert _derive_recommendation_pdf(4.25) == "strongly_recommended"
        assert _derive_recommendation_pdf(4.0) == "recommended"
        assert _derive_recommendation_pdf(3.5) == "recommended"
        assert _derive_recommendation_pdf(3.0) == "can_progress"
        assert _derive_recommendation_pdf(2.75) == "can_progress"
        assert _derive_recommendation_pdf(2.4) == "not_recommended"
        assert _derive_recommendation_pdf(2.0) == "not_recommended"
        assert _derive_recommendation_pdf(1.5) == "strongly_not_recommended"

    def test_agrees_with_schemas_module(self):
        from core.pdf import _derive_recommendation_pdf
        from core.schemas import derive_recommendation
        for s in [1.0, 1.5, 2.0, 2.4, 2.75, 3.0, 3.5, 3.99, 4.25, 4.6, 5.0]:
            assert _derive_recommendation_pdf(s) == derive_recommendation(s), \
                f"PDF and schemas disagree at composite={s}"

    def test_handles_none(self):
        from core.pdf import _derive_recommendation_pdf
        # None → default 3.0 → can_progress.
        assert _derive_recommendation_pdf(None) == "can_progress"


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
