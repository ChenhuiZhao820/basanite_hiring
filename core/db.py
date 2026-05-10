"""
Supabase client and data helpers for Basanite.
"""
import os
from datetime import datetime, timezone
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


def hash_auth_token(token: str) -> str:
    """ENG-60: peppered SHA-256 of an auth token. The pepper makes a
    read-only DB breach insufficient for forgery — the attacker also
    needs TOKEN_HASH_PEPPER to recompute hashes. Falls back to plain
    SHA-256 in dev/test when the pepper isn't set."""
    import hashlib
    import hmac as _hmac
    pepper = os.getenv("TOKEN_HASH_PEPPER", "")
    if not pepper:
        return hashlib.sha256((token or "").encode("utf-8")).hexdigest()
    return _hmac.new(
        pepper.encode("utf-8"),
        (token or "").encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _sanitize_user_agent(ua: str | None) -> str | None:
    """ENG-48: strip control chars and HTML metacharacters before
    persisting a User-Agent string. Pydantic enforces a 400-char cap on
    the inbound side; this is the on-write defence so a malicious UA
    can't survive a future admin UI render unescaped, and a candidate
    can't sneak null bytes / line terminators that would confuse log
    parsing.

    Keeps printable ASCII and common UA punctuation. Trims to 400 chars.
    """
    if not ua:
        return None
    import re
    # Strip ASCII control chars (0x00-0x1F, 0x7F) and HTML-special chars.
    cleaned = re.sub(r"[\x00-\x1f\x7f<>\"'`]", "", ua)
    cleaned = cleaned.strip()
    if not cleaned:
        return None
    return cleaned[:400]


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
    """Look up a role by its assessment link token.

    ENG-20: also enforces the optional expiry column. A token whose
    `assessment_link_token_expires_at` is in the past is treated the same
    as an unknown token (returns None) — callers don't need to distinguish.
    """
    client = get_client()
    if not client:
        return None
    try:
        result = client.table("roles").select("*").eq("assessment_link_token", token).single().execute()
        role = result.data
        if not role:
            return None
        expires_at = role.get("assessment_link_token_expires_at")
        if expires_at:
            from datetime import datetime, timezone
            try:
                exp = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
                if datetime.now(timezone.utc) >= exp:
                    return None
            except (ValueError, AttributeError):
                # Malformed timestamp shouldn't make us serve content; fail closed.
                return None
        return role
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


def get_active_assessment_for_candidate(role_id: str, candidate_user_id: str) -> dict | None:
    """ENG-24: return an existing in_progress / completed assessment for this
    candidate on this role, if any. Used by /start to refuse duplicate
    interviews before insert (the partial unique index in migration 038
    is the belt-and-braces enforcement)."""
    client = get_client()
    if not client:
        return None
    try:
        result = (
            client.table("assessments")
            .select("id, status")
            .eq("role_id", role_id)
            .eq("candidate_user_id", candidate_user_id)
            .in_("status", ["in_progress", "completed"])
            .limit(1)
            .execute()
        )
        rows = result.data or []
        return rows[0] if rows else None
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
    """True if we have already processed this Merge event (idempotency).

    DEPRECATED for the dedup gate — see ``claim_webhook_event``. Kept
    for read-only callers (admin dashboards, retention sweeps) that
    want to know whether an event has already been observed.
    """
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


def claim_webhook_event(
    event_id: str,
    *,
    hook_type: str | None = None,
    linked_account_id: str | None = None,
) -> bool:
    """ENG-55: atomically reserve an event_id against the UNIQUE
    constraint on ats_webhook_events.event_id. Returns True if we won
    the race (this caller now owns processing) or False if a row already
    exists (duplicate; caller should ack and skip).

    The previous check-then-insert pattern (``webhook_event_seen``
    followed by ``log_webhook_event``) had a TOCTOU window: two
    concurrent deliveries with the same event_id both saw "not seen"
    and both proceeded to process the event, hitting the ATS twice
    and emailing the candidate twice. This helper closes the window
    by relying on the database UNIQUE to be the arbiter.
    """
    client = get_client()
    if not client:
        # Fail closed: if we can't reach the DB we can't dedup, so the
        # safer call is to skip rather than maybe-double-process.
        return False
    row = {
        "event_id": event_id,
        "hook_type": hook_type,
        "linked_account_id": linked_account_id,
        "status": "received",
    }
    try:
        result = client.table("ats_webhook_events").insert(row).execute()
        return bool(result.data)
    except Exception as e:
        # PostgresUniqueViolation surfaces with code 23505 in the
        # supabase-py exception path. Treat any "duplicate"-shaped
        # error as a lost race and let the caller ack.
        msg = str(e).lower()
        if any(t in msg for t in ("duplicate", "unique", "23505", "conflict")):
            return False
        # Anything else is an unexpected DB error. Fail closed (ack as
        # duplicate) rather than risk double-processing — Merge will
        # retry only on non-2xx, so we ack and the operator sees the
        # log.
        print(f"  DB claim_webhook_event error: {e}")
        return False


def claim_dsar_for_action(token: str) -> dict | None:
    """ENG-55 + ENG-60: atomically advance a DSAR row from
    status='pending' to status='verified', keyed on the hash of the
    verification token. Returns the row if we won the race; None if
    the token is unknown, the row is in a non-pending state, or
    already consumed.

    The DB stores only the peppered hash (mig 043). The plaintext
    token from the candidate's email link is hashed here; a read-only
    DB breach can't be turned into mass token forgery without the
    pepper.
    """
    client = get_client()
    if not client:
        return None
    try:
        result = (
            client.table("dsar_requests")
            .update({"status": "verified"})
            .eq("verification_token_hash", hash_auth_token(token))
            .eq("status", "pending")
            .execute()
        )
        rows = result.data or []
        return rows[0] if rows else None
    except Exception as e:
        print(f"  DB claim_dsar_for_action error: {e}")
        return None


def claim_invitation(token: str) -> dict | None:
    """ENG-55 + ENG-60: atomically mark an org invitation as accepted,
    keyed on the peppered hash of the token. Only the row that's still
    pending (not accepted, not cancelled) will match — concurrent
    claims by the same caller race here, and the loser gets None so
    the API can return 410.

    Caller is still responsible for verifying expiry + email match
    BEFORE inviting them to call this; failures after the atomic claim
    leave the row marked accepted, which is acceptable because the
    token is single-use either way.
    """
    client = get_client()
    if not client:
        return None
    try:
        result = (
            client.table("org_invitations")
            .update({"accepted_at": datetime.now(timezone.utc).isoformat()})
            .eq("token_hash", hash_auth_token(token))
            .is_("accepted_at", "null")
            .is_("cancelled_at", "null")
            .execute()
        )
        rows = result.data or []
        return rows[0] if rows else None
    except Exception as e:
        print(f"  DB claim_invitation error: {e}")
        return None


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
    """Persist an ATS-touching error so the dashboard can surface it.

    ENG-43: error_message is scrubbed before insert. Render log retention
    is ~30 days but the DB row is forever; Merge SDK exceptions routinely
    contain candidate names/emails that we don't want sitting in the
    ats_sync_errors table indefinitely.
    """
    from core.log_safe import scrub

    client = get_client()
    if not client:
        return None
    try:
        # Cap at 1000 chars to bound DB row size, then scrub. scrub() also
        # truncates by default; we keep the explicit slice as belt-and-
        # braces in case scrub's defaults change.
        cleaned = scrub((error_message or "")[:1000], max_len=1000) or None
        row = {
            "org_id": org_id,
            "connection_id": connection_id,
            "assessment_id": assessment_id,
            "direction": direction,
            "operation": operation,
            "error_class": error_class,
            "error_message": cleaned,
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
    """Resolve an ATS-sourced invite token to its assessment row.

    ENG-30: rejects rows where invite_expires_at has passed. NULL expiry
    is treated as "no expiry" so legacy rows remain valid (the column was
    backfilled to NULL by migration 040). New ATS invites get a 30-day
    expiry stamped at creation time.
    """
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
        row = (result.data or [None])[0]
        if not row:
            return None
        expires_at = row.get("invite_expires_at")
        if expires_at:
            try:
                exp_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                if exp_dt <= datetime.now(timezone.utc):
                    return None
            except Exception:
                # Malformed timestamp — fail closed.
                return None
        return row
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
    """ENG-60: persist the peppered hash of the token, never the
    plaintext. The plaintext stays in the recipient's email URL; the
    DB only ever sees the hash.
    """
    client = get_client()
    if not client:
        return None
    try:
        r = client.table("org_invitations").insert({
            "org_id": org_id,
            "email": email.lower().strip(),
            "role": role,
            "token_hash": hash_auth_token(token),
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
    """ENG-60: lookup by peppered hash. The plaintext token comes off
    the recipient's email link; we re-hash it here and match against
    the column populated at create_org_invitation time.
    """
    client = get_client()
    if not client:
        return None
    try:
        r = (
            client.table("org_invitations")
            .select("*, orgs(id, name)")
            .eq("token_hash", hash_auth_token(token))
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
            "user_agent": _sanitize_user_agent(user_agent),
            "ip_hash": ip_hash,
        }
        result = client.table("consent_records").insert(row).execute()
        return (result.data or [None])[0]
    except Exception as e:
        print(f"  DB log_consent error: {e}")
        return None


# ─── Report access audit (ENG-42) ──────────────────────────────────────────

def log_report_access(
    *,
    assessment_id: str,
    report_type: str,
    access_kind: str,
    accessed_by: str | None = None,
    ip_hash: str | None = None,
    user_agent: str | None = None,
) -> dict | None:
    """Insert a row into report_access_log.

    ``access_kind`` is one of: 'hirer-dashboard', 'candidate-self',
    'public-signed-url'. Failures are logged but don't propagate — an
    audit-log write that fails shouldn't block the candidate or hirer
    from seeing the report; the next call will try again.
    """
    if access_kind not in ("hirer-dashboard", "candidate-self", "public-signed-url"):
        return None
    if report_type not in ("hirer", "candidate"):
        return None

    client = get_client()
    if not client:
        return None
    try:
        row = {
            "assessment_id": assessment_id,
            "accessed_by": accessed_by,
            "report_type": report_type,
            "access_kind": access_kind,
            "ip_hash": ip_hash,
            "user_agent": _sanitize_user_agent(user_agent),
        }
        result = client.table("report_access_log").insert(row).execute()
        return (result.data or [None])[0]
    except Exception as e:
        print(f"  DB log_report_access error: {e}")
        return None


def list_report_accesses_for_assessment(assessment_id: str) -> list[dict]:
    """Return the access audit trail for an assessment, newest first.

    Used by the DSAR export to surface "who has viewed your report" to
    the candidate. Service-role bypasses RLS, so this returns the full
    trail regardless of caller; the API tier is responsible for
    authorising before invoking it.
    """
    client = get_client()
    if not client:
        return []
    try:
        result = (
            client.table("report_access_log")
            .select("id, accessed_by, accessed_at, report_type, access_kind")
            .eq("assessment_id", assessment_id)
            .order("accessed_at", desc=True)
            .limit(500)
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"  DB list_report_accesses error: {e}")
        return []
