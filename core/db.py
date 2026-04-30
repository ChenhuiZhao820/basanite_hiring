"""
Supabase client and data helpers for Basanite.
"""
import os
from dotenv import load_dotenv

load_dotenv()

_client = None


def get_client():
    global _client
    if _client is not None:
        return _client

    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        return None

    from supabase import create_client
    _client = create_client(url, key)
    return _client


# ─── Role helpers ──────────────────────────────────────────────────────────

def create_role(role: dict) -> dict | None:
    client = get_client()
    if not client:
        return None
    try:
        result = client.table("roles").insert(role).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"  DB create_role error: {e}")
        return None


def get_role(role_id: str) -> dict | None:
    client = get_client()
    if not client:
        return None
    try:
        result = client.table("roles").select("*").eq("id", role_id).single().execute()
        return result.data
    except Exception:
        return None


def get_role_by_token(token: str) -> dict | None:
    client = get_client()
    if not client:
        return None
    try:
        result = client.table("roles").select("*").eq("assessment_link_token", token).single().execute()
        return result.data
    except Exception:
        return None


def get_roles_for_user(user_id: str) -> list[dict]:
    client = get_client()
    if not client:
        return []
    try:
        result = client.table("roles").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return result.data or []
    except Exception:
        return []


def update_role(role_id: str, **fields) -> bool:
    client = get_client()
    if not client:
        return False
    try:
        client.table("roles").update(fields).eq("id", role_id).execute()
        return True
    except Exception as e:
        print(f"  DB update_role error: {e}")
        return False


# ─── Assessment helpers ────────────────────────────────────────────────────

def create_assessment(assessment: dict) -> dict | None:
    client = get_client()
    if not client:
        return None
    try:
        result = client.table("assessments").insert(assessment).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"  DB create_assessment error: {e}")
        return None


def get_assessment(assessment_id: str) -> dict | None:
    client = get_client()
    if not client:
        return None
    try:
        result = client.table("assessments").select("*").eq("id", assessment_id).single().execute()
        return result.data
    except Exception:
        return None


def get_assessments_for_role(role_id: str) -> list[dict]:
    client = get_client()
    if not client:
        return []
    try:
        result = (
            client.table("assessments")
            .select("*, dimension_scores(*)")
            .eq("role_id", role_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception:
        return []


def update_assessment(assessment_id: str, **fields) -> bool:
    client = get_client()
    if not client:
        return False
    try:
        client.table("assessments").update(fields).eq("id", assessment_id).execute()
        return True
    except Exception as e:
        print(f"  DB update_assessment error: {e}")
        return False


# ─── Interview session helpers ─────────────────────────────────────────────

def create_interview_session(assessment_id: str) -> dict | None:
    client = get_client()
    if not client:
        return None
    try:
        result = client.table("interview_sessions").insert({
            "assessment_id": assessment_id,
            "messages": [],
            "current_phase": "not_started",
            "internal_state": {},
        }).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"  DB create_interview_session error: {e}")
        return None


def get_interview_session(assessment_id: str) -> dict | None:
    client = get_client()
    if not client:
        return None
    try:
        result = (
            client.table("interview_sessions")
            .select("*")
            .eq("assessment_id", assessment_id)
            .single()
            .execute()
        )
        return result.data
    except Exception:
        return None


def update_interview_session(session_id: str, **fields) -> bool:
    client = get_client()
    if not client:
        return False
    try:
        client.table("interview_sessions").update(fields).eq("id", session_id).execute()
        return True
    except Exception as e:
        print(f"  DB update_interview_session error: {e}")
        return False


# ─── Scores and reports ────────────────────────────────────────────────────

def save_dimension_scores(assessment_id: str, scores: list[dict]) -> bool:
    client = get_client()
    if not client:
        return False
    try:
        rows = [
            {
                "assessment_id": assessment_id,
                "dimension_key": s["dimension"],
                "score": s.get("score"),
                "quotation_basis": s.get("quotation_basis"),
                "notes": s.get("notes"),
            }
            for s in scores
        ]
        client.table("dimension_scores").upsert(
            rows, on_conflict="assessment_id,dimension_key"
        ).execute()
        return True
    except Exception as e:
        print(f"  DB save_dimension_scores error: {e}")
        return False


def save_report(assessment_id: str, report_type: str, content: dict) -> bool:
    client = get_client()
    if not client:
        return False
    try:
        client.table("reports").upsert(
            {
                "assessment_id": assessment_id,
                "report_type": report_type,
                "content": content,
            },
            on_conflict="assessment_id,report_type",
        ).execute()
        return True
    except Exception as e:
        print(f"  DB save_report error: {e}")
        return False


def get_report(assessment_id: str, report_type: str) -> dict | None:
    client = get_client()
    if not client:
        return None
    try:
        result = (
            client.table("reports")
            .select("*")
            .eq("assessment_id", assessment_id)
            .eq("report_type", report_type)
            .single()
            .execute()
        )
        return result.data
    except Exception:
        return None


# ─── Org / membership helpers ──────────────────────────────────────────────

def get_or_create_personal_org(user_id: str, name_hint: str | None = None) -> str | None:
    """
    Return the org_id that this hirer belongs to. If they have no membership
    yet (a brand-new hirer who hasn't created any role), create a personal
    org with id = user_id (matching the PR1 backfill convention) and make
    them its owner.

    Returns the org_id on success, or None if the DB is unreachable.
    """
    client = get_client()
    if not client:
        return None
    try:
        existing = (
            client.table("org_members")
            .select("org_id")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            return existing.data[0]["org_id"]
        # No membership yet — create a personal org with id = user_id.
        org_name = (name_hint or "Personal").strip() + "'s workspace"
        client.table("orgs").upsert(
            {"id": user_id, "name": org_name}, on_conflict="id"
        ).execute()
        client.table("org_members").upsert(
            {"org_id": user_id, "user_id": user_id, "role": "owner"},
            on_conflict="org_id,user_id",
        ).execute()
        return user_id
    except Exception as e:
        print(f"  DB get_or_create_personal_org error: {e}")
        return None


# ─── ATS connection helpers ────────────────────────────────────────────────

def upsert_ats_connection(org_id: str, account_token_encrypted: str, **fields) -> dict | None:
    """
    Idempotently create or refresh the connected ATS row for an org. v1
    enforces one connected ATS per org via a partial unique index, so this
    helper updates the existing connected row if present.
    """
    client = get_client()
    if not client:
        return None
    try:
        existing = (
            client.table("ats_connections")
            .select("id")
            .eq("org_id", org_id)
            .eq("status", "connected")
            .limit(1)
            .execute()
        )
        if existing.data:
            cid = existing.data[0]["id"]
            update = {
                "account_token_encrypted": account_token_encrypted,
                "status": "connected",
                **fields,
                "updated_at": "now()",
            }
            client.table("ats_connections").update(update).eq("id", cid).execute()
            return {"id": cid}
        row = {
            "org_id": org_id,
            "account_token_encrypted": account_token_encrypted,
            **fields,
        }
        result = client.table("ats_connections").insert(row).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"  DB upsert_ats_connection error: {e}")
        return None


def get_ats_connections_for_org(org_id: str) -> list[dict]:
    client = get_client()
    if not client:
        return []
    try:
        # Never return the encrypted token to the dashboard.
        result = (
            client.table("ats_connections")
            .select(
                "id, org_id, provider, status, end_user_email, "
                "connected_at, last_synced_at"
            )
            .eq("org_id", org_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception:
        return []


def get_ats_connection(connection_id: str) -> dict | None:
    """Internal use — returns the row INCLUDING the encrypted token."""
    client = get_client()
    if not client:
        return None
    try:
        result = (
            client.table("ats_connections")
            .select("*")
            .eq("id", connection_id)
            .single()
            .execute()
        )
        return result.data
    except Exception:
        return None


def mark_ats_connection_disconnected(connection_id: str) -> bool:
    client = get_client()
    if not client:
        return False
    try:
        client.table("ats_connections").update(
            {"status": "disconnected", "updated_at": "now()"}
        ).eq("id", connection_id).execute()
        return True
    except Exception as e:
        print(f"  DB mark_ats_connection_disconnected error: {e}")
        return False
