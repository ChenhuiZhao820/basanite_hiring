"""Tests for core.db assessment helpers."""

from core import db


class TestCreateAssessment:
    def test_returns_inserted_row(self, fake_supabase):
        fake_supabase.table("assessments").execute_data = [{"id": "a1"}]
        assert db.create_assessment({"role_id": "r1"}) == {"id": "a1"}

    def test_returns_none_on_empty_data(self, fake_supabase):
        fake_supabase.table("assessments").execute_data = []
        assert db.create_assessment({"role_id": "r1"}) is None

    def test_returns_none_on_error(self, fake_supabase):
        fake_supabase.table("assessments").execute_raises = Exception()
        assert db.create_assessment({"role_id": "r1"}) is None


class TestGetAssessment:
    def test_returns_row(self, fake_supabase):
        fake_supabase.table("assessments").execute_data = {"id": "a1"}
        assert db.get_assessment("a1") == {"id": "a1"}

    def test_filters_by_id(self, fake_supabase):
        fake_supabase.table("assessments").execute_data = {"id": "a1"}
        db.get_assessment("a1")
        eqs = [c for c in fake_supabase.table("assessments").calls if c[0] == "eq"]
        assert any(c[1] == ("id", "a1") for c in eqs)

    def test_returns_none_on_error(self, fake_supabase):
        fake_supabase.table("assessments").execute_raises = Exception()
        assert db.get_assessment("a1") is None


class TestGetAssessmentsForRole:
    def test_returns_list(self, fake_supabase):
        rows = [{"id": "a1"}, {"id": "a2"}]
        fake_supabase.table("assessments").execute_data = rows
        assert db.get_assessments_for_role("r1") == rows

    def test_includes_dimension_scores_in_select(self, fake_supabase):
        fake_supabase.table("assessments").execute_data = []
        db.get_assessments_for_role("r1")
        selects = [c for c in fake_supabase.table("assessments").calls if c[0] == "select"]
        assert selects
        # Select string should include the dimension_scores join.
        assert "dimension_scores" in selects[0][1][0]

    def test_returns_empty_on_error(self, fake_supabase):
        fake_supabase.table("assessments").execute_raises = Exception()
        assert db.get_assessments_for_role("r1") == []


class TestUpdateAssessment:
    def test_passes_kwargs(self, fake_supabase):
        fake_supabase.table("assessments").execute_data = []
        db.update_assessment("a1", status="completed")
        updates = [c for c in fake_supabase.table("assessments").calls if c[0] == "update"]
        assert updates and updates[0][1][0] == {"status": "completed"}

    def test_returns_true_on_success(self, fake_supabase):
        fake_supabase.table("assessments").execute_data = []
        assert db.update_assessment("a1", status="x") is True

    def test_returns_false_on_error(self, fake_supabase):
        fake_supabase.table("assessments").execute_raises = Exception()
        assert db.update_assessment("a1", status="x") is False
