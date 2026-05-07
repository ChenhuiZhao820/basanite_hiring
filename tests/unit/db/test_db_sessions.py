"""Tests for core.db interview session helpers."""

from core import db


class TestCreateInterviewSession:
    def test_inserts_initial_state(self, fake_supabase):
        fake_supabase.table("interview_sessions").execute_data = [
            {"id": "s1", "current_phase": "not_started"},
        ]
        out = db.create_interview_session("a1")
        assert out["current_phase"] == "not_started"
        inserts = [c for c in fake_supabase.table("interview_sessions").calls
                   if c[0] == "insert"]
        assert inserts
        # First positional arg is the dict.
        payload = inserts[0][1][0]
        assert payload["assessment_id"] == "a1"
        assert payload["messages"] == []
        assert payload["current_phase"] == "not_started"
        assert payload["internal_state"] == {}

    def test_returns_none_on_error(self, fake_supabase):
        fake_supabase.table("interview_sessions").execute_raises = Exception()
        assert db.create_interview_session("a1") is None


class TestGetInterviewSession:
    def test_filters_by_assessment_id(self, fake_supabase):
        fake_supabase.table("interview_sessions").execute_data = {"id": "s1"}
        db.get_interview_session("a1")
        eqs = [c for c in fake_supabase.table("interview_sessions").calls if c[0] == "eq"]
        assert any(c[1] == ("assessment_id", "a1") for c in eqs)

    def test_returns_none_on_error(self, fake_supabase):
        fake_supabase.table("interview_sessions").execute_raises = Exception()
        assert db.get_interview_session("a1") is None


class TestUpdateInterviewSession:
    def test_passes_kwargs(self, fake_supabase):
        fake_supabase.table("interview_sessions").execute_data = []
        db.update_interview_session("s1", messages=[{"role": "user"}])
        updates = [c for c in fake_supabase.table("interview_sessions").calls if c[0] == "update"]
        assert updates and updates[0][1][0]["messages"] == [{"role": "user"}]

    def test_returns_false_on_error(self, fake_supabase):
        fake_supabase.table("interview_sessions").execute_raises = Exception()
        assert db.update_interview_session("s1", messages=[]) is False
