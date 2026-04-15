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


def upsert_candidate(candidate: dict) -> dict | bool:
    """
    Upsert a candidate into Supabase, deduplicating on linkedin_url.

    Returns a dict {"inserted": bool, "id": str | None} on success,
    or False if DB not configured or error.
    The "inserted" flag distinguishes new rows from updates (SYS-5 tracking).
    """
    client = get_client()
    if not client:
        return False

    # Preserve existing enrichment/profile data when new value is None,
    # but always overwrite display fields (current_role etc.) so stale data doesn't persist.
    PRESERVE_IF_NONE = {"skills", "match_score", "match_reason", "years_experience", "education", "positions", "current_role", "current_company"}
    payload = {k: v for k, v in candidate.items() if v is not None or k not in PRESERVE_IF_NONE}

    linkedin_url = payload.get("linkedin_url")
    if not linkedin_url:
        return False

    try:
        # Check if candidate already exists so we can decide what to do with job_search_id.
        # On conflict we must NOT overwrite job_search_id — the candidate belongs to whichever
        # search first discovered them. Concurrent searches finding the same person would
        # otherwise steal each other's candidates, leaving earlier searches with 0 results.
        existing = client.table("candidates").select("id").eq("linkedin_url", linkedin_url).maybe_single().execute()

        if existing is not None and existing.data:
            # Update enrichment fields only — never touch job_search_id or match_score/reason
            # (those reflect the original search's evaluation of this candidate).
            skip = {"job_search_id", "match_score", "match_reason"}
            update_payload = {k: v for k, v in payload.items() if k not in skip}
            if update_payload:
                client.table("candidates").update(update_payload).eq("linkedin_url", linkedin_url).execute()
            # Return the candidate ID so caller can write candidate_scores
            candidate["id"] = existing.data.get("id")
            return {"inserted": False, "id": existing.data.get("id")}
        else:
            result = client.table("candidates").insert(payload).execute()
            inserted_id = result.data[0].get("id") if result.data else None
            candidate["id"] = inserted_id
            return {"inserted": True, "id": inserted_id}

    except Exception as e:
        print(f"  DB upsert error: {e}")
        return False


def get_job_search_status(job_search_id: str) -> str | None:
    """Return the current status of a job_search row, or None if not found."""
    client = get_client()
    if not client or not job_search_id:
        return None
    try:
        result = client.table("job_searches").select("status").eq("id", job_search_id).single().execute()
        return result.data.get("status") if result.data else None
    except Exception:
        return None


def update_job_search(job_search_id: str, **fields) -> bool:
    """
    Update fields on a job_searches row. Uses service-role key (bypasses RLS).
    Common usage:
      update_job_search(id, status='running')
      update_job_search(id, status='complete', candidate_count=142, completed_at='...')
    """
    client = get_client()
    if not client or not job_search_id:
        return False

    try:
        client.table("job_searches").update(fields).eq("id", job_search_id).execute()
        return True
    except Exception as e:
        print(f"  DB job_search update error: {e}")
        return False


# ─── Basanite: Role helpers ────────────────────────────────────────────────

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


# ─── Basanite: Assessment helpers ──────────────────────────────────────────

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


# ─── Basanite: Interview session helpers ───────────────────────────────────

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


# ─── Basanite: Scores and reports ──────────────────────────────────────────

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
