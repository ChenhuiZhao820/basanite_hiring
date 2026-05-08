"""Tests for core.db role helpers."""

import pytest

from core import db


class TestCreateRole:
    def test_returns_inserted_row(self, fake_supabase):
        fake_supabase.table("roles").execute_data = [{"id": "r1", "title": "X"}]
        out = db.create_role({"title": "X"})
        assert out == {"id": "r1", "title": "X"}

    def test_returns_none_when_no_data(self, fake_supabase):
        fake_supabase.table("roles").execute_data = []
        assert db.create_role({"title": "X"}) is None

    def test_returns_none_on_db_error(self, fake_supabase):
        fake_supabase.table("roles").execute_raises = RuntimeError("boom")
        assert db.create_role({"title": "X"}) is None

    def test_returns_none_when_no_client(self, monkeypatch):
        monkeypatch.setattr(db, "get_client", lambda: None)
        assert db.create_role({"title": "X"}) is None

    def test_calls_insert_on_roles_table(self, fake_supabase):
        fake_supabase.table("roles").execute_data = [{"id": "r1"}]
        db.create_role({"title": "X"})
        ops = [c[0] for c in fake_supabase.table("roles").calls]
        assert "insert" in ops


class TestGetRole:
    def test_returns_row(self, fake_supabase):
        fake_supabase.table("roles").execute_data = {"id": "r1"}
        assert db.get_role("r1") == {"id": "r1"}

    def test_returns_none_on_error(self, fake_supabase):
        fake_supabase.table("roles").execute_raises = ValueError("nope")
        assert db.get_role("r1") is None


class TestGetRoleByToken:
    def test_filters_by_token(self, fake_supabase):
        fake_supabase.table("roles").execute_data = {"id": "r1", "assessment_link_token": "tok"}
        out = db.get_role_by_token("tok")
        assert out["assessment_link_token"] == "tok"
        # Verify the right column was used.
        eq_calls = [c for c in fake_supabase.table("roles").calls if c[0] == "eq"]
        assert any(c[1] == ("assessment_link_token", "tok") for c in eq_calls)

    def test_returns_none_on_error(self, fake_supabase):
        fake_supabase.table("roles").execute_raises = Exception()
        assert db.get_role_by_token("x") is None

    # ENG-20: optional token expiry.
    def test_null_expiry_passes_through(self, fake_supabase):
        fake_supabase.table("roles").execute_data = {
            "id": "r1",
            "assessment_link_token": "tok",
            "assessment_link_token_expires_at": None,
        }
        out = db.get_role_by_token("tok")
        assert out is not None
        assert out["id"] == "r1"

    def test_future_expiry_passes_through(self, fake_supabase):
        from datetime import datetime, timezone, timedelta
        future = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        fake_supabase.table("roles").execute_data = {
            "id": "r1",
            "assessment_link_token": "tok",
            "assessment_link_token_expires_at": future,
        }
        out = db.get_role_by_token("tok")
        assert out is not None
        assert out["id"] == "r1"

    def test_past_expiry_returns_none(self, fake_supabase):
        from datetime import datetime, timezone, timedelta
        past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        fake_supabase.table("roles").execute_data = {
            "id": "r1",
            "assessment_link_token": "tok",
            "assessment_link_token_expires_at": past,
        }
        assert db.get_role_by_token("tok") is None

    def test_malformed_expiry_fails_closed(self, fake_supabase):
        fake_supabase.table("roles").execute_data = {
            "id": "r1",
            "assessment_link_token": "tok",
            "assessment_link_token_expires_at": "not-a-timestamp",
        }
        # Fail closed — don't serve content if we can't parse the expiry.
        assert db.get_role_by_token("tok") is None

    def test_z_suffix_expiry_parsed(self, fake_supabase):
        # Postgres TIMESTAMPTZ commonly serialises with a 'Z' suffix; ensure
        # we parse that variant as well as +00:00.
        from datetime import datetime, timezone, timedelta
        future = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat().replace("+00:00", "Z")
        fake_supabase.table("roles").execute_data = {
            "id": "r1",
            "assessment_link_token": "tok",
            "assessment_link_token_expires_at": future,
        }
        out = db.get_role_by_token("tok")
        assert out is not None


class TestGetRolesForUser:
    def test_returns_list(self, fake_supabase):
        rows = [{"id": "r1"}, {"id": "r2"}]
        fake_supabase.table("roles").execute_data = rows
        assert db.get_roles_for_user("u1") == rows

    def test_returns_empty_list_when_data_none(self, fake_supabase):
        fake_supabase.table("roles").execute_data = None
        assert db.get_roles_for_user("u1") == []

    def test_orders_desc_by_created_at(self, fake_supabase):
        fake_supabase.table("roles").execute_data = []
        db.get_roles_for_user("u1")
        order = [c for c in fake_supabase.table("roles").calls if c[0] == "order"]
        assert order, "should call .order"
        assert order[0][1] == ("created_at",)
        assert order[0][2].get("desc") is True

    def test_returns_empty_on_error(self, fake_supabase):
        fake_supabase.table("roles").execute_raises = Exception()
        assert db.get_roles_for_user("u1") == []


class TestActiveAssessmentForCandidate:
    """ENG-24: get_active_assessment_for_candidate returns the existing
    in_progress / completed row for the (role, candidate) pair, if any."""

    def test_returns_existing_active_row(self, fake_supabase):
        fake_supabase.table("assessments").execute_data = [
            {"id": "a1", "status": "in_progress"},
        ]
        out = db.get_active_assessment_for_candidate("r1", "u1")
        assert out is not None
        assert out["id"] == "a1"

    def test_returns_none_when_no_match(self, fake_supabase):
        fake_supabase.table("assessments").execute_data = []
        assert db.get_active_assessment_for_candidate("r1", "u1") is None

    def test_filters_on_role_and_candidate(self, fake_supabase):
        fake_supabase.table("assessments").execute_data = []
        db.get_active_assessment_for_candidate("r1", "u1")
        eq_calls = [c for c in fake_supabase.table("assessments").calls if c[0] == "eq"]
        assert ("role_id", "r1") in [c[1] for c in eq_calls]
        assert ("candidate_user_id", "u1") in [c[1] for c in eq_calls]

    def test_filters_on_active_statuses(self, fake_supabase):
        fake_supabase.table("assessments").execute_data = []
        db.get_active_assessment_for_candidate("r1", "u1")
        in_calls = [c for c in fake_supabase.table("assessments").calls if c[0] == "in_"]
        # in_("status", ["in_progress", "completed"])
        assert any(c[1][0] == "status" for c in in_calls)
        for c in in_calls:
            if c[1][0] == "status":
                assert "in_progress" in c[1][1]
                assert "completed" in c[1][1]

    def test_returns_none_on_db_error(self, fake_supabase):
        fake_supabase.table("assessments").execute_raises = Exception()
        assert db.get_active_assessment_for_candidate("r1", "u1") is None


class TestUpdateRole:
    def test_returns_true_on_success(self, fake_supabase):
        fake_supabase.table("roles").execute_data = []
        assert db.update_role("r1", title="New") is True

    def test_returns_false_on_error(self, fake_supabase):
        fake_supabase.table("roles").execute_raises = Exception()
        assert db.update_role("r1", title="X") is False

    def test_passes_kwargs_as_update_payload(self, fake_supabase):
        fake_supabase.table("roles").execute_data = []
        db.update_role("r1", title="New", status="live")
        update_calls = [c for c in fake_supabase.table("roles").calls if c[0] == "update"]
        assert update_calls
        # First positional arg to update() is the dict of fields.
        assert update_calls[0][1][0] == {"title": "New", "status": "live"}
