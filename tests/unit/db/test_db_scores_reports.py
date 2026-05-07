"""Tests for core.db score + report persistence."""

from core import db


class TestSaveDimensionScores:
    def test_returns_true_on_success(self, fake_supabase, sample_dimension_scores):
        fake_supabase.table("dimension_scores").execute_data = []
        assert db.save_dimension_scores("a1", sample_dimension_scores) is True

    def test_uses_upsert_with_correct_conflict(self, fake_supabase, sample_dimension_scores):
        fake_supabase.table("dimension_scores").execute_data = []
        db.save_dimension_scores("a1", sample_dimension_scores)
        upserts = [c for c in fake_supabase.table("dimension_scores").calls if c[0] == "upsert"]
        assert upserts
        kwargs = upserts[0][2]
        assert kwargs.get("on_conflict") == "assessment_id,dimension_key"

    def test_payload_shape(self, fake_supabase):
        fake_supabase.table("dimension_scores").execute_data = []
        scores = [{"dimension": "x", "score": 4,
                   "quotation_basis": "q", "notes": "n"}]
        db.save_dimension_scores("a1", scores)
        upserts = [c for c in fake_supabase.table("dimension_scores").calls if c[0] == "upsert"]
        rows = upserts[0][1][0]
        assert rows[0]["assessment_id"] == "a1"
        assert rows[0]["dimension_key"] == "x"
        assert rows[0]["score"] == 4
        assert rows[0]["quotation_basis"] == "q"
        assert rows[0]["notes"] == "n"

    def test_returns_false_on_error(self, fake_supabase, sample_dimension_scores):
        fake_supabase.table("dimension_scores").execute_raises = Exception()
        assert db.save_dimension_scores("a1", sample_dimension_scores) is False


class TestSaveReport:
    def test_uses_upsert_with_correct_conflict(self, fake_supabase):
        fake_supabase.table("reports").execute_data = []
        db.save_report("a1", "hirer", {"summary": "x"})
        upserts = [c for c in fake_supabase.table("reports").calls if c[0] == "upsert"]
        assert upserts
        assert upserts[0][2].get("on_conflict") == "assessment_id,report_type"
        payload = upserts[0][1][0]
        assert payload["assessment_id"] == "a1"
        assert payload["report_type"] == "hirer"
        assert payload["content"] == {"summary": "x"}

    def test_returns_false_on_error(self, fake_supabase):
        fake_supabase.table("reports").execute_raises = Exception()
        assert db.save_report("a1", "hirer", {}) is False


class TestGetReport:
    def test_filters_by_assessment_and_type(self, fake_supabase):
        fake_supabase.table("reports").execute_data = {"id": "rep1"}
        db.get_report("a1", "candidate")
        eqs = [c for c in fake_supabase.table("reports").calls if c[0] == "eq"]
        assert any(c[1] == ("assessment_id", "a1") for c in eqs)
        assert any(c[1] == ("report_type", "candidate") for c in eqs)

    def test_returns_none_on_error(self, fake_supabase):
        fake_supabase.table("reports").execute_raises = Exception()
        assert db.get_report("a1", "hirer") is None
