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


# ─── ATS job mappings (PR4) ────────────────────────────────────────────────

def upsert_ats_job_mapping(
    *,
    connection_id: str,
    org_id: str,
    merge_job_id: str,
    role_id: str,
    remote_job_id: str | None = None,
    job_name: str | None = None,
    auto_invite: bool = True,
) -> dict | None:
    """Map an ATS job to a Basanite role. Re-mapping replaces."""
    client = get_client()
    if not client:
        return None
    try:
        row = {
            "connection_id": connection_id,
            "org_id": org_id,
            "merge_job_id": merge_job_id,
            "remote_job_id": remote_job_id,
            "job_name": job_name,
            "role_id": role_id,
            "auto_invite": auto_invite,
            "updated_at": "now()",
        }
        result = (
            client.table("ats_job_mappings")
            .upsert(row, on_conflict="connection_id,merge_job_id")
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"  DB upsert_ats_job_mapping error: {e}")
        return None


def get_ats_job_mappings_for_org(org_id: str) -> list[dict]:
    client = get_client()
    if not client:
        return []
    try:
        result = (
            client.table("ats_job_mappings")
            .select("*")
            .eq("org_id", org_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"  DB get_ats_job_mappings_for_org error: {e}")
        return []


def get_ats_job_mapping_by_merge_job(connection_id: str, merge_job_id: str) -> dict | None:
    client = get_client()
    if not client:
        return None
    try:
        result = (
            client.table("ats_job_mappings")
            .select("*")
            .eq("connection_id", connection_id)
            .eq("merge_job_id", merge_job_id)
            .limit(1)
            .execute()
        )
        return (result.data or [None])[0]
    except Exception:
        return None


def delete_ats_job_mapping(mapping_id: str, org_id: str) -> bool:
    """Delete a mapping, scoped to org_id for safety."""
    client = get_client()
    if not client:
        return False
    try:
        client.table("ats_job_mappings").delete().eq("id", mapping_id).eq(
            "org_id", org_id
        ).execute()
        return True
    except Exception as e:
        print(f"  DB delete_ats_job_mapping error: {e}")
        return False


# ─── ATS webhook event log (PR5) ───────────────────────────────────────────

def webhook_event_seen(event_id: str) -> bool:
    """True if we have already processed this Merge event (idempotency)."""
    client = get_client()
    if not client:
        return False
    try:
        result = (
            client.table("ats_webhook_events")
            .select("id")
            .eq("event_id", event_id)
            .limit(1)
            .execute()
        )
        return bool(result.data)
    except Exception:
        return False


def log_webhook_event(
    *,
    event_id: str,
    hook_type: str | None,
    linked_account_id: str | None,
    status: str,
    payload_summary: dict | None = None,
    error_message: str | None = None,
) -> dict | None:
    """Insert (or upsert by event_id) a row into ats_webhook_events."""
    client = get_client()
    if not client:
        return None
    try:
        row = {
            "event_id": event_id,
            "hook_type": hook_type,
            "linked_account_id": linked_account_id,
            "status": status,
            "payload_summary": payload_summary,
            "error_message": (error_message or "")[:1000] or None,
            "processed_at": "now()" if status in ("processed", "failed", "ignored") else None,
        }
        result = (
            client.table("ats_webhook_events")
            .upsert(row, on_conflict="event_id")
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"  DB log_webhook_event error: {e}")
        return None


# ─── ATS sync error log (PR5/PR7) ──────────────────────────────────────────

def log_ats_sync_error(
    *,
    direction: str,
    operation: str,
    error_class: str,
    error_message: str,
    org_id: str | None = None,
    connection_id: str | None = None,
    assessment_id: str | None = None,
    context: dict | None = None,
) -> dict | None:
    """Persist an ATS-touching error so the dashboard can surface it."""
    client = get_client()
    if not client:
        return None
    try:
        row = {
            "org_id": org_id,
            "connection_id": connection_id,
            "assessment_id": assessment_id,
            "direction": direction,
            "operation": operation,
            "error_class": error_class,
            "error_message": (error_message or "")[:1000] or None,
            "context": context,
        }
        result = client.table("ats_sync_errors").insert(row).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"  DB log_ats_sync_error error: {e}")
        return None


# ─── Org feature flags (PR7) ───────────────────────────────────────────────

def get_org_feature_flags(org_id: str) -> dict:
    client = get_client()
    if not client:
        return {}
    try:
        result = (
            client.table("orgs")
            .select("feature_flags")
            .eq("id", org_id)
            .single()
            .execute()
        )
        return (result.data or {}).get("feature_flags") or {}
    except Exception:
        return {}


def set_org_feature_flag(org_id: str, key: str, value) -> bool:
    """Merge a single flag into orgs.feature_flags. Reads-then-writes; not atomic
    under contention but flags flip rarely (manual ops action)."""
    client = get_client()
    if not client:
        return False
    try:
        flags = get_org_feature_flags(org_id)
        flags[key] = value
        client.table("orgs").update(
            {"feature_flags": flags, "updated_at": "now()"}
        ).eq("id", org_id).execute()
        return True
    except Exception as e:
        print(f"  DB set_org_feature_flag error: {e}")
        return False


# ─── Assessment lookups for ATS flow (PR5/PR6) ─────────────────────────────

def get_assessment_by_invite_token(invite_token: str) -> dict | None:
    client = get_client()
    if not client:
        return None
    try:
        result = (
            client.table("assessments")
            .select("*")
            .eq("invite_token", invite_token)
            .limit(1)
            .execute()
        )
        return (result.data or [None])[0]
    except Exception:
        return None


def get_assessment_by_merge_application(merge_application_id: str) -> dict | None:
    client = get_client()
    if not client:
        return None
    try:
        result = (
            client.table("assessments")
            .select("*")
            .eq("merge_application_id", merge_application_id)
            .limit(1)
            .execute()
        )
        return (result.data or [None])[0]
    except Exception:
        return None


# ─── Org membership + settings + invitations (migration 036) ──────────────

def is_org_member(user_id: str, org_id: str) -> str | None:
    """Return the member's role in the org, or None if not a member.
    Reused by every endpoint that gates on org membership."""
    client = get_client()
    if not client:
        return None
    try:
        r = (
            client.table("org_members")
            .select("role")
            .eq("user_id", user_id)
            .eq("org_id", org_id)
            .limit(1)
            .execute()
        )
        return (r.data or [{}])[0].get("role") if r.data else None
    except Exception:
        return None


def list_orgs_for_user(user_id: str) -> list[dict]:
    """Return every org the user is a member of, with their role."""
    client = get_client()
    if not client:
        return []
    try:
        r = (
            client.table("org_members")
            .select("role, joined_at:created_at, orgs!inner(id, name, description, auto_join_domain)")
            .eq("user_id", user_id)
            .execute()
        )
        out = []
        for row in r.data or []:
            org = row.get("orgs") or {}
            out.append({
                "id": org.get("id"),
                "name": org.get("name"),
                "description": org.get("description"),
                "auto_join_domain": org.get("auto_join_domain"),
                "role": row.get("role"),
                "joined_at": row.get("joined_at"),
            })
        return out
    except Exception as e:
        print(f"  DB list_orgs_for_user error: {e}")
        return []


def list_org_members(org_id: str) -> list[dict]:
    """Return members of an org with their auth.users metadata.
    Service-role read; the API gates on membership before calling."""
    client = get_client()
    if not client:
        return []
    try:
        rows = (
            client.table("org_members")
            .select("user_id, role, created_at")
            .eq("org_id", org_id)
            .order("created_at", desc=False)
            .execute()
        ).data or []
        # Resolve emails + names from auth.users via the admin API. supabase-py
        # exposes this through .auth.admin.list_users(); we filter in Python
        # because the page size is small (members per org will rarely exceed
        # 50 in practice).
        member_ids = {r["user_id"] for r in rows}
        if not member_ids:
            return rows
        try:
            page = client.auth.admin.list_users()
            users = (page.users if hasattr(page, "users") else page) or []
            by_id = {u.id: u for u in users if u.id in member_ids}
        except Exception:
            by_id = {}
        out = []
        for r in rows:
            u = by_id.get(r["user_id"])
            md = (getattr(u, "user_metadata", None) or {}) if u else {}
            out.append({
                "user_id": r["user_id"],
                "role": r["role"],
                "joined_at": r["created_at"],
                "email": getattr(u, "email", None) if u else None,
                "full_name": md.get("full_name") if md else None,
            })
        return out
    except Exception as e:
        print(f"  DB list_org_members error: {e}")
        return []


def update_org(org_id: str, **fields) -> bool:
    """Patch an org row. Validation lives in the API layer."""
    client = get_client()
    if not client:
        return False
    try:
        client.table("orgs").update(
            {**fields, "updated_at": "now()"}
        ).eq("id", org_id).execute()
        return True
    except Exception as e:
        print(f"  DB update_org error: {e}")
        return False


def get_org(org_id: str) -> dict | None:
    client = get_client()
    if not client:
        return None
    try:
        r = client.table("orgs").select("*").eq("id", org_id).single().execute()
        return r.data
    except Exception:
        return None


def get_org_by_auto_join_domain(domain: str) -> dict | None:
    """Look up the org configured to auto-join an email domain.
    Caller is responsible for filtering free email providers first."""
    client = get_client()
    if not client:
        return None
    try:
        r = (
            client.table("orgs")
            .select("*")
            .ilike("auto_join_domain", domain)
            .limit(1)
            .execute()
        )
        return (r.data or [None])[0]
    except Exception:
        return None


def create_org(*, name: str, description: str | None, owner_user_id: str) -> dict | None:
    """Create a new org and add the caller as the owner. Used by the
    'Create organisation' flow on the workspace switcher."""
    client = get_client()
    if not client:
        return None
    try:
        new_org = (
            client.table("orgs")
            .insert({"name": name[:200], "description": (description or None) and description[:500]})
            .execute()
        )
        org = (new_org.data or [None])[0]
        if not org:
            return None
        client.table("org_members").upsert(
            {"org_id": org["id"], "user_id": owner_user_id, "role": "owner"},
            on_conflict="org_id,user_id",
        ).execute()
        return org
    except Exception as e:
        print(f"  DB create_org error: {e}")
        return None


def add_org_member(org_id: str, user_id: str, role: str = "member") -> bool:
    client = get_client()
    if not client:
        return False
    try:
        client.table("org_members").upsert(
            {"org_id": org_id, "user_id": user_id, "role": role},
            on_conflict="org_id,user_id",
        ).execute()
        return True
    except Exception as e:
        print(f"  DB add_org_member error: {e}")
        return False


def remove_org_member(org_id: str, user_id: str) -> bool:
    client = get_client()
    if not client:
        return False
    try:
        client.table("org_members").delete().eq("org_id", org_id).eq(
            "user_id", user_id
        ).execute()
        return True
    except Exception as e:
        print(f"  DB remove_org_member error: {e}")
        return False


def change_org_member_role(org_id: str, user_id: str, new_role: str) -> bool:
    client = get_client()
    if not client:
        return False
    try:
        client.table("org_members").update({"role": new_role}).eq(
            "org_id", org_id
        ).eq("user_id", user_id).execute()
        return True
    except Exception as e:
        print(f"  DB change_org_member_role error: {e}")
        return False


def count_org_owners(org_id: str) -> int:
    client = get_client()
    if not client:
        return 0
    try:
        r = (
            client.table("org_members")
            .select("user_id", count="exact")
            .eq("org_id", org_id)
            .eq("role", "owner")
            .execute()
        )
        return r.count or 0
    except Exception:
        return 0


def delete_org(org_id: str) -> bool:
    """Hard-delete an org. Cascades through every org_id-keyed FK."""
    client = get_client()
    if not client:
        return False
    try:
        client.table("orgs").delete().eq("id", org_id).execute()
        return True
    except Exception as e:
        print(f"  DB delete_org error: {e}")
        return False


# ─── Active org context ────────────────────────────────────────────────────

def get_active_org_id(user_id: str) -> str | None:
    """Return the user's selected active org_id, falling back to the
    personal org. Reads auth.users.user_metadata.active_org_id."""
    client = get_client()
    if not client:
        return None
    try:
        u = client.auth.admin.get_user_by_id(user_id)
        user = getattr(u, "user", None) or u
        md = (getattr(user, "user_metadata", None) or {}) if user else {}
        active = md.get("active_org_id") if md else None
        if active and is_org_member(user_id, active):
            return active
    except Exception:
        pass
    # Fallback: personal org (id=user_id by convention).
    return get_or_create_personal_org(user_id)


def set_active_org_id(user_id: str, org_id: str) -> bool:
    """Mutate auth.users.user_metadata.active_org_id. Caller must verify
    membership first (the callsite in api.py does)."""
    client = get_client()
    if not client:
        return False
    try:
        u = client.auth.admin.get_user_by_id(user_id)
        user = getattr(u, "user", None) or u
        md = dict(getattr(user, "user_metadata", None) or {})
        md["active_org_id"] = org_id
        client.auth.admin.update_user_by_id(user_id, {"user_metadata": md})
        return True
    except Exception as e:
        print(f"  DB set_active_org_id error: {e}")
        return False


# ─── Invitations ───────────────────────────────────────────────────────────

def create_org_invitation(
    *, org_id: str, email: str, role: str, token: str, expires_at: str, created_by: str
) -> dict | None:
    client = get_client()
    if not client:
        return None
    try:
        r = client.table("org_invitations").insert({
            "org_id": org_id,
            "email": email.lower().strip(),
            "role": role,
            "token": token,
            "expires_at": expires_at,
            "created_by": created_by,
        }).execute()
        return (r.data or [None])[0]
    except Exception as e:
        print(f"  DB create_org_invitation error: {e}")
        return None


def list_pending_invitations(org_id: str) -> list[dict]:
    client = get_client()
    if not client:
        return []
    try:
        r = (
            client.table("org_invitations")
            .select("id, email, role, expires_at, created_at, created_by")
            .eq("org_id", org_id)
            .is_("accepted_at", "null")
            .is_("cancelled_at", "null")
            .order("created_at", desc=True)
            .execute()
        )
        return r.data or []
    except Exception:
        return []


def get_invitation_by_token(token: str) -> dict | None:
    client = get_client()
    if not client:
        return None
    try:
        r = (
            client.table("org_invitations")
            .select("*, orgs(id, name)")
            .eq("token", token)
            .limit(1)
            .execute()
        )
        return (r.data or [None])[0]
    except Exception:
        return None


def cancel_invitation(invitation_id: str, org_id: str) -> bool:
    client = get_client()
    if not client:
        return False
    try:
        client.table("org_invitations").update(
            {"cancelled_at": "now()"}
        ).eq("id", invitation_id).eq("org_id", org_id).execute()
        return True
    except Exception as e:
        print(f"  DB cancel_invitation error: {e}")
        return False


def mark_invitation_accepted(invitation_id: str) -> bool:
    client = get_client()
    if not client:
        return False
    try:
        client.table("org_invitations").update(
            {"accepted_at": "now()"}
        ).eq("id", invitation_id).execute()
        return True
    except Exception as e:
        print(f"  DB mark_invitation_accepted error: {e}")
        return False


# ─── Org custom voices (cloned interviewer voices) ─────────────────────────

def list_org_custom_voices(org_id: str, *, include_deleted: bool = False) -> list[dict]:
    """Return active cloned voices for an org. Service-role read."""
    client = get_client()
    if not client:
        return []
    try:
        q = (
            client.table("org_custom_voices")
            .select("id, org_id, eleven_voice_id, name, description, sample_url, created_by, created_at, deleted_at")
            .eq("org_id", org_id)
            .order("created_at", desc=True)
        )
        if not include_deleted:
            q = q.is_("deleted_at", "null")
        result = q.execute()
        return result.data or []
    except Exception as e:
        print(f"  DB list_org_custom_voices error: {e}")
        return []


def create_org_custom_voice(
    *,
    org_id: str,
    eleven_voice_id: str,
    name: str,
    description: str | None,
    created_by: str | None,
    sample_url: str | None = None,
) -> dict | None:
    client = get_client()
    if not client:
        return None
    try:
        row = {
            "org_id": org_id,
            "eleven_voice_id": eleven_voice_id,
            "name": name[:80],
            "description": (description or None) and description[:200],
            "sample_url": sample_url,
            "created_by": created_by,
        }
        result = client.table("org_custom_voices").insert(row).execute()
        return (result.data or [None])[0]
    except Exception as e:
        print(f"  DB create_org_custom_voice error: {e}")
        return None


def soft_delete_org_custom_voice(custom_voice_id: str, org_id: str) -> bool:
    """Mark deleted; retention sweep handles the cascade to ElevenLabs."""
    client = get_client()
    if not client:
        return False
    try:
        client.table("org_custom_voices").update(
            {"deleted_at": "now()"}
        ).eq("id", custom_voice_id).eq("org_id", org_id).execute()
        return True
    except Exception as e:
        print(f"  DB soft_delete_org_custom_voice error: {e}")
        return False


def get_org_custom_voice_by_eleven_id(org_id: str, eleven_voice_id: str) -> dict | None:
    """Lookup by ElevenLabs voice ID — used by validation."""
    client = get_client()
    if not client:
        return None
    try:
        result = (
            client.table("org_custom_voices")
            .select("*")
            .eq("org_id", org_id)
            .eq("eleven_voice_id", eleven_voice_id)
            .is_("deleted_at", "null")
            .limit(1)
            .execute()
        )
        return (result.data or [None])[0]
    except Exception:
        return None


def update_org_custom_voice(custom_voice_id: str, org_id: str, **fields) -> bool:
    """Generic patcher used to attach sample_url after clone, or rename."""
    client = get_client()
    if not client:
        return False
    try:
        client.table("org_custom_voices").update(fields).eq(
            "id", custom_voice_id
        ).eq("org_id", org_id).execute()
        return True
    except Exception as e:
        print(f"  DB update_org_custom_voice error: {e}")
        return False


# ─── Consent records (used by voice-clone consent + GDPR DSARs) ────────────

def log_consent(
    *,
    user_id: str | None,
    consent_type: str,
    granted: bool,
    policy_version: str | None = None,
    assessment_id: str | None = None,
    user_agent: str | None = None,
    ip_hash: str | None = None,
) -> dict | None:
    """Append a row to consent_records (Article 7 burden of proof)."""
    client = get_client()
    if not client:
        return None
    try:
        row = {
            "user_id": user_id,
            "assessment_id": assessment_id,
            "consent_type": consent_type,
            "granted": bool(granted),
            "policy_version": policy_version,
            "user_agent": user_agent[:400] if user_agent else None,
            "ip_hash": ip_hash,
        }
        result = client.table("consent_records").insert(row).execute()
        return (result.data or [None])[0]
    except Exception as e:
        print(f"  DB log_consent error: {e}")
        return None
