"""
Basanite FastAPI server, AI powered technical interview and assessment platform.

Run with:
    source .venv/bin/activate
    uvicorn api:app --reload --port 8000
"""
import asyncio
import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header, Request, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()


app = FastAPI(title="Basanite API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://basanite.co.uk",
        "https://www.basanite.co.uk",
    ],
    allow_methods=["POST", "GET", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

_PIPELINE_SECRET = os.getenv("PIPELINE_API_SECRET", "")
if not _PIPELINE_SECRET:
    # Startup-time ops warning; request handlers still return generic 401
    # rather than leaking deployment state to callers.
    print("  [startup] WARN: PIPELINE_API_SECRET is not set — internal endpoints will reject all requests.")


def _verify_internal(authorization: str | None):
    """Raise 401 if the request doesn't carry the internal pipeline secret.

    Uses constant-time comparison to avoid leaking the secret byte-by-byte
    via response-time side channels. Returns the same generic 401 whether
    the secret is missing from the deployment or the request is malformed.
    """
    if not _PIPELINE_SECRET or not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
    expected = f"Bearer {_PIPELINE_SECRET}"
    if not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


# ─── Public-endpoint rate limiter ──────────────────────────────────────────
# ENG-30 / ENG-34: the Next.js wrapper rate-limits each candidate-facing
# endpoint, but FastAPI is reachable directly if the host is exposed. This
# is the in-memory sliding-window stop-gap; ENG-34 will move to a shared
# Redis backend so it survives multi-replica scaling. Single-instance is
# the current production topology, so per-worker buckets are sufficient.

import time as _time
from collections import defaultdict, deque

_ratelimit_buckets: dict[str, deque] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    """Extract the originating IP. Render and Vercel both put the real
    client IP first in X-Forwarded-For; fall back to the socket address.
    """
    fwd = request.headers.get("x-forwarded-for") or ""
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _hash_request_ip(request: Request) -> str | None:
    """Return a SHA-256-hex of the masked client IP, or None if missing.

    ENG-42 stores this on report_access_log rows so we can spot abuse
    patterns ("the same IP downloaded 50 reports") without retaining
    fully-identifying addresses. The IP is partially masked (last octet
    of v4, last 80 bits of v6) before hashing so the hash space is
    smaller and collisions are intentional at the /24 level.
    """
    ip = _client_ip(request)
    if not ip or ip == "unknown":
        return None
    if ":" in ip:
        # IPv6 — keep first three groups, zero the rest.
        parts = ip.split(":")
        masked = ":".join(parts[:3]) + "::0"
    else:
        parts = ip.split(".")
        if len(parts) != 4:
            return None
        parts[3] = "0"
        masked = ".".join(parts)
    return hashlib.sha256(masked.encode("utf-8")).hexdigest()[:32]


def _rate_limit(request: Request, *, bucket: str, max_requests: int, window_seconds: float):
    """Sliding-window per-IP limiter. Raises 429 when the bucket is full.

    `bucket` is the endpoint identifier, so /assess/invite limits are
    counted independently of /assess/{token}/start, etc.
    """
    key = f"{bucket}:{_client_ip(request)}"
    now = _time.monotonic()
    cutoff = now - window_seconds
    q = _ratelimit_buckets[key]
    while q and q[0] < cutoff:
        q.popleft()
    if len(q) >= max_requests:
        # Surface a Retry-After hint based on the oldest entry in the
        # window. The candidate UI uses this to back off cleanly.
        retry_after = max(1, int(q[0] + window_seconds - now))
        raise HTTPException(
            status_code=429,
            detail="Too many requests",
            headers={"Retry-After": str(retry_after)},
        )
    q.append(now)


# ─── Per-session prompt-token signing (ENG-31) ─────────────────────────────
# The 638-line interview prompt + the role JD + the hirer's
# `custom_instructions` used to be returned to the candidate's browser so
# the @elevenlabs/react SDK could inject them as overrides. Anyone hitting
# F12 saw the rubric and the company's confidential instructions.
#
# New flow: mint an opaque per-session token tied to the assessment_id,
# return only the token to the browser, and have ElevenLabs fetch the
# real prompt server-to-server via the Conversation Initiation Webhook
# at /elevenlabs/conv-init. The browser passes the token via the SDK's
# `dynamicVariables` field; ElevenLabs forwards it to the webhook.
#
# Rolling this out requires a one-time admin step in the ElevenLabs UI
# (configure the agent's Conversation Initiation Webhook URL). Until
# that's done, the legacy prompt-on-browser behaviour is preserved by
# leaving INTERVIEW_PROMPT_VIA_WEBHOOK unset/false. Once the webhook is
# wired up, set:
#
#   INTERVIEW_PROMPT_VIA_WEBHOOK=true
#   INTERVIEW_SESSION_SECRET=<32+ random bytes>
#   ELEVENLABS_WEBHOOK_SECRET=<shared with ElevenLabs agent config>
#
# and the prompt will stop being shipped to candidates.

_INTERVIEW_SESSION_SECRET = os.getenv("INTERVIEW_SESSION_SECRET", "")
_USE_PROMPT_WEBHOOK = os.getenv("INTERVIEW_PROMPT_VIA_WEBHOOK", "").lower() in {"1", "true", "yes"}
_ELEVENLABS_WEBHOOK_SECRET = os.getenv("ELEVENLABS_WEBHOOK_SECRET", "")

if _USE_PROMPT_WEBHOOK and not _INTERVIEW_SESSION_SECRET:
    print(
        "  [startup] WARN: INTERVIEW_PROMPT_VIA_WEBHOOK is on but "
        "INTERVIEW_SESSION_SECRET is missing — falling back to legacy "
        "prompt-on-browser flow. ENG-31 vulnerability remains live."
    )
    _USE_PROMPT_WEBHOOK = False


# ─── Test Mode (internal tester walkthrough) ────────────────────────────────
# Lets an internal tester walk the full candidate journey against ONE
# designated test role. Sessions started on that role are stamped
# `is_mock` at /start; every other consumer (prompt assembly, Director,
# report generation, dashboard) reads the stored flag. Mock-ness is
# decided once, server-side, from the role the link resolves to — no
# client input is ever consulted, so a tampered browser can neither
# create a mock session on a real role nor turn a mock one real.
#
# Both vars must be set for any session to be mock:
#
#   TEST_MODE_ENABLED=true
#   TEST_MODE_ROLE_ID=<uuid of the designated test role>
#
# Leave them unset in production and no mock row can ever be created.
_TEST_MODE_ENABLED = os.getenv("TEST_MODE_ENABLED", "").lower() in {"1", "true", "yes"}
_TEST_MODE_ROLE_ID = os.getenv("TEST_MODE_ROLE_ID", "")


def _is_test_mode_role(role_id: str) -> bool:
    """True only when Test Mode is enabled AND this is the designated
    test role. Reads module state (not env) so tests can monkeypatch."""
    return _TEST_MODE_ENABLED and bool(_TEST_MODE_ROLE_ID) and role_id == _TEST_MODE_ROLE_ID


def _mint_session_prompt_token(assessment_id: str, ttl_seconds: int = 3600) -> str:
    """Sign an opaque token tying a session to an assessment_id.

    Format: `<assessment_id>:<expires_unix>:<hmac_sha256_hex>`. The
    Conversation Initiation Webhook at /elevenlabs/conv-init verifies
    the signature and uses the assessment_id to regenerate the prompt
    server-side.
    """
    if not _INTERVIEW_SESSION_SECRET:
        raise HTTPException(
            status_code=500,
            detail="INTERVIEW_SESSION_SECRET not configured",
        )
    expires = int((datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)).timestamp())
    payload = f"{assessment_id}:{expires}"
    sig = hmac.new(
        _INTERVIEW_SESSION_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload}:{sig}"


def _verify_session_prompt_token(token: str) -> str | None:
    """Returns the assessment_id if the token is valid and unexpired,
    None otherwise. Constant-time signature compare to prevent timing
    side-channels on the secret.
    """
    if not _INTERVIEW_SESSION_SECRET or not token:
        return None
    parts = token.rsplit(":", 2)
    if len(parts) != 3:
        return None
    assessment_id, expires_str, sig = parts
    payload = f"{assessment_id}:{expires_str}"
    expected = hmac.new(
        _INTERVIEW_SESSION_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, sig):
        return None
    try:
        if int(expires_str) < int(datetime.now(timezone.utc).timestamp()):
            return None
    except ValueError:
        return None
    return assessment_id


# ─── Upload limits ─────────────────────────────────────────────────────────

_MAX_CV_BYTES = 10 * 1024 * 1024          # 10 MB — comfortably larger than any CV
_MAX_RECORDING_BYTES = 200 * 1024 * 1024  # 200 MB — ~45 min low-bitrate webm

# ENG-27: WebM/Matroska files begin with the EBML magic. We reject any
# upload to /upload-recording whose first four bytes don't match — without
# this check, a candidate could upload arbitrary binary content as their
# "interview recording" (malware, exfil, illegal content), all stored
# under the assessment's storage prefix.
_WEBM_MAGIC = b"\x1a\x45\xdf\xa3"
_MIN_RECORDING_BYTES = 1024  # < 1KB is not a real recording


# ENG-36: voice-clone audio magic-byte whitelist. Even though /voices/clone
# is gated by the pipeline secret, validating the actual bytes server-side
# protects ElevenLabs (and us) from a hirer who uploads a PE/ELF/HTML
# polyglot relabelled "voice.webm". Same defence shape as ENG-27.
_AUDIO_MAGIC_PREFIXES: tuple[bytes, ...] = (
    b"\x1a\x45\xdf\xa3",  # WebM / Matroska EBML
    b"OggS",               # Ogg
    b"ID3",                # MP3 with ID3v2 tag
    b"\xff\xfb",           # MPEG-1 Layer 3 audio frame sync (no ID3)
    b"\xff\xf3",           # MPEG-2 Layer 3 frame sync
    b"\xff\xf2",           # MPEG-2.5 Layer 3 frame sync
)


def _is_supported_voice_audio(data: bytes) -> bool:
    """Return True if the byte stream starts with a whitelisted audio
    magic. WAV is special-cased because it's `RIFF` + 4 size bytes +
    `WAVE`, not a contiguous prefix.
    """
    if not data:
        return False
    if any(data.startswith(m) for m in _AUDIO_MAGIC_PREFIXES):
        return True
    if data[:4] == b"RIFF" and data[8:12] == b"WAVE":
        return True
    return False


async def _read_bounded(upload: UploadFile, limit: int) -> bytes:
    """Read an upload into memory, refusing if it exceeds `limit` bytes.

    Uses a one-shot bounded read so a malicious client can't exhaust worker
    memory by streaming a multi-gigabyte body before we look at Content-Length.
    """
    data = await upload.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(
            status_code=413,
            detail=f"File too large (max {limit // (1024 * 1024)} MB)",
        )
    return data


# ─── Health ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "basanite"}


# ─── Roles ─────────────────────────────────────────────────────────────────

class CreateRoleRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=200)
    company_name: str | None = Field(default=None, max_length=200)
    job_description: str = Field(min_length=1, max_length=20000)


class UpdateRoleRequest(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    dimensions: list[str] | None = Field(default=None, max_length=16)
    technical_depth: str | None = Field(default=None, max_length=64)
    eligibility_constraints: dict | None = None
    status: str | None = Field(default=None, max_length=32)
    interview_duration_minutes: int | None = Field(default=None, ge=1, le=120)
    custom_instructions: str | None = Field(default=None, max_length=2000)
    interviewer_voice_id: str | None = Field(default=None, max_length=64)


@app.post("/roles")
async def create_role(
    body: CreateRoleRequest,
    authorization: str | None = Header(default=None),
):
    _verify_internal(authorization)
    from core.db import create_role as db_create_role
    from agents.jd_validate import is_confirmed_injection, validate_jd

    # A pasted JD gets the same injection gate (and strike ladder) as a
    # file upload — otherwise the textbox is a free bypass of the upload
    # defence. The "is this actually a JD" bounce deliberately does NOT
    # apply here: pasting is an explicit act, and the paste path has
    # always accepted whatever the hirer typed.
    verdict = await validate_jd(body.job_description)
    if is_confirmed_injection(verdict):
        await _handle_injection_strike(
            body.user_id, None, "(pasted job description)", verdict,
        )
    _log_subpunitive_injection_finding(
        body.user_id, None, "(pasted job description)", verdict,
    )

    role = db_create_role({
        "user_id": body.user_id,
        "title": body.title,
        "company_name": body.company_name,
        "job_description": body.job_description,
        "dimensions": [],
        "status": "draft",
    })
    if not role:
        raise HTTPException(status_code=500, detail="Failed to create role")
    return role


@app.get("/roles/{role_id}")
async def get_role(
    role_id: str,
    authorization: str | None = Header(default=None),
):
    _verify_internal(authorization)
    from core.db import get_role as db_get_role
    role = db_get_role(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


@app.patch("/roles/{role_id}")
async def update_role(
    role_id: str,
    body: UpdateRoleRequest,
    authorization: str | None = Header(default=None),
):
    _verify_internal(authorization)
    from core.db import update_role as db_update_role, get_role as db_get_role
    from core.voices import is_valid_voice

    fields = {k: v for k, v in body.model_dump().items() if v is not None}

    # The interview plan is a per-dimension artifact: clearing the last
    # dimension also clears the stored plan so a stale one can't be baked
    # into the prompt at go-live.
    if body.dimensions == []:
        fields["interview_plan"] = None

    # Reject voice IDs that aren't in our curated catalogue OR a cloned
    # voice in the same org as this role. We resolve the role's org_id
    # before validating so the per-org check has the right scope.
    if "interviewer_voice_id" in fields:
        existing_role = db_get_role(role_id)
        role_org_id = (existing_role or {}).get("org_id")
        if not is_valid_voice(fields["interviewer_voice_id"], org_id=role_org_id):
            raise HTTPException(status_code=400, detail="Unknown interviewer_voice_id")

    # dimensions + eligibility_constraints are JSONB, pass the native Python
    # value so supabase-py encodes correctly. Double-encoding here stored them
    # as a JSON *string* instead of a JSON array/object, which is what caused
    # `len(role["dimensions"])` to return 91 (char count) instead of 4.
    if not db_update_role(role_id, **fields):
        raise HTTPException(status_code=500, detail="Failed to update role")
    return {"status": "updated"}


@app.post("/roles/{role_id}/recommend-dimensions")
async def recommend_dimensions(
    role_id: str,
    authorization: str | None = Header(default=None),
):
    _verify_internal(authorization)
    from core.db import get_role as db_get_role
    from agents.dimensions import recommend_dimensions as recommend

    role = db_get_role(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    result = await recommend(role["job_description"])
    return result


class UpdatePlanRequest(BaseModel):
    interview_plan: dict


@app.post("/roles/{role_id}/generate-plan")
async def generate_plan(
    role_id: str,
    authorization: str | None = Header(default=None),
):
    """Generate and store the hirer-readable interview plan for a role."""
    _verify_internal(authorization)
    from core.db import get_role as db_get_role, update_role as db_update_role
    from agents.interview_plan import generate_interview_plan

    role = db_get_role(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if not role.get("dimensions"):
        raise HTTPException(status_code=400, detail="No dimensions configured")

    plan = await generate_interview_plan(role)
    if plan.get("error"):
        raise HTTPException(status_code=502, detail="Plan generation failed, please retry")

    db_update_role(role_id, interview_plan=plan)
    return {"status": "generated", "interview_plan": plan}


@app.patch("/roles/{role_id}/plan")
async def update_plan(
    role_id: str,
    body: UpdatePlanRequest,
    authorization: str | None = Header(default=None),
):
    """Save hirer edits to the interview plan. Only allowed while the role
    is still in draft — once live the plan is locked."""
    _verify_internal(authorization)
    from datetime import datetime, timezone
    from core.db import get_role as db_get_role, update_role as db_update_role
    from core.schemas import InterviewPlan, validate_or_error

    role = db_get_role(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.get("status") != "draft":
        raise HTTPException(status_code=409, detail="Interview plan is locked once the role is live")

    # Re-validate the hirer-edited plan against the canonical shape so a
    # tampered payload can't smuggle arbitrary JSON into the roles row.
    plan = validate_or_error(body.interview_plan, InterviewPlan)
    if plan.get("error"):
        raise HTTPException(status_code=422, detail="Invalid interview plan shape")

    if not db_update_role(
        role_id,
        interview_plan=plan,
        interview_plan_edited_at=datetime.now(timezone.utc).isoformat(),
    ):
        raise HTTPException(status_code=500, detail="Failed to update plan")
    return {"status": "updated", "interview_plan": plan}


@app.post("/roles/{role_id}/generate-prompt")
async def generate_prompt(
    role_id: str,
    authorization: str | None = Header(default=None),
):
    """Generate and store the interview agent prompt for a role."""
    _verify_internal(authorization)
    from core.db import get_role as db_get_role, update_role as db_update_role
    from interview import assemble_interview_prompt

    role = db_get_role(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Generate a generic prompt (no candidate-specific context yet)
    prompt = assemble_interview_prompt(role, {
        "name": "[CANDIDATE]",
        "experience_path": "path_a",
        "anchor_points": [],
        "experience": [],
    })
    db_update_role(role_id, interview_agent_prompt=prompt)
    return {"status": "generated", "prompt_length": len(prompt)}


# Structured reasons a hirer can give for going live with zero dimensions.
# Keys are shared with the GoLiveButton component; "other" unlocks free text.
_NO_DIMENSIONS_REASONS = {"general_screen", "dimensions_dont_fit", "just_testing", "other"}


class GoLiveRequest(BaseModel):
    no_dimensions_reason: str | None = Field(default=None, max_length=64)
    no_dimensions_details: str | None = Field(default=None, max_length=2000)


@app.post("/roles/{role_id}/go-live")
async def go_live(
    role_id: str,
    body: GoLiveRequest | None = None,
    authorization: str | None = Header(default=None),
):
    _verify_internal(authorization)
    from core.db import (
        get_role as db_get_role,
        update_role as db_update_role,
        insert_go_live_feedback,
    )

    role = db_get_role(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Zero dimensions is allowed (the interview becomes a general
    # conversational screen), but we ask why so the product can learn
    # what's missing from the dimension set.
    dims = _coerce_json_field(role.get("dimensions") or [])
    if not isinstance(dims, list):
        dims = []
    if not dims:
        reason = (body.no_dimensions_reason or "").strip() if body else ""
        if reason not in _NO_DIMENSIONS_REASONS:
            raise HTTPException(
                status_code=400,
                detail="Please tell us why you're going live without dimensions",
            )
        details = (body.no_dimensions_details or "").strip() or None
        insert_go_live_feedback(
            role_id,
            role.get("user_id"),
            reason,
            details if reason == "other" else None,
        )

    # Bake the (possibly hirer-edited) interview plan into the stored generic
    # prompt at the moment the plan locks. Per-assessment prompts are still
    # assembled fresh at /start with candidate context.
    from interview import assemble_interview_prompt
    prompt = assemble_interview_prompt(role, {
        "name": "[CANDIDATE]",
        "experience_path": "path_a",
        "anchor_points": [],
        "experience": [],
    })
    db_update_role(role_id, status="live", interview_agent_prompt=prompt)
    return {
        "status": "live",
        "assessment_link_token": role["assessment_link_token"],
    }


@app.get("/roles/{role_id}/candidates")
async def get_candidates(
    role_id: str,
    authorization: str | None = Header(default=None),
):
    _verify_internal(authorization)
    from core.db import get_assessments_for_role
    assessments = get_assessments_for_role(role_id)
    return {"candidates": assessments}


class InviteCandidateRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)
    candidate_name: str = Field(min_length=1, max_length=200)
    candidate_email: str = Field(min_length=3, max_length=320)


@app.post("/roles/{role_id}/invite")
async def invite_candidate(
    role_id: str,
    body: InviteCandidateRequest,
    authorization: str | None = Header(default=None),
):
    """Hirer-initiated candidate invite. Mints a pending assessment with a
    unique invite_token (same plumbing as ATS auto-invites) and emails the
    candidate their personal /assess/invite/{token} link.

    The Next.js layer verifies the session user owns the role before
    proxying here; the user_id ownership re-check below is defence in depth
    against a leaked pipeline secret being used to spray invites from
    someone else's role.
    """
    _verify_internal(authorization)
    from core.db import (
        get_role as db_get_role,
        create_assessment,
        get_pending_invite_by_role_and_email,
        get_assessments_for_candidate_email,
    )
    from core.email import _EMAIL_RE, send_invite_email

    role = db_get_role(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.get("user_id") != body.user_id:
        raise HTTPException(status_code=404, detail="Role not found")
    if role["status"] != "live":
        raise HTTPException(status_code=409, detail="Role must be live before inviting candidates")

    email = body.candidate_email.strip()
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Invalid email address")

    # A candidate who already interviewed (or is mid-interview) shouldn't
    # get a fresh invite — ENG-24's one-active-per-candidate rule holds
    # for the invite path too.
    existing = get_assessments_for_candidate_email(role_id, email)
    if any(a.get("status") in ("in_progress", "completed") for a in existing):
        raise HTTPException(
            status_code=409,
            detail="This candidate already has an interview in progress or completed for this role.",
        )

    # Duplicate-send guard: re-send the existing pending invite (same
    # token) instead of minting a second row for the same email.
    assessment = get_pending_invite_by_role_and_email(role_id, email)
    created = False
    if not assessment:
        invite_token = secrets.token_urlsafe(32)
        invite_expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        assessment = create_assessment({
            "role_id": role_id,
            "candidate_name": body.candidate_name.strip(),
            "candidate_email": email,
            "status": "pending",
            "source": "hirer_invite",
            "invite_token": invite_token,
            "invite_expires_at": invite_expires_at,
            "is_mock": _is_test_mode_role(role_id),
        })
        if not assessment:
            raise HTTPException(status_code=500, detail="Failed to create invite")
        created = True

    invite_url = _build_invite_url(assessment["invite_token"])
    invite_sent = send_invite_email(
        to=email,
        candidate_name=assessment.get("candidate_name") or body.candidate_name,
        role_title=role.get("title") or "interview",
        company_name=role.get("company_name"),
        invite_url=invite_url,
        duration_minutes=role.get("interview_duration_minutes") or 30,
        role_summary=role.get("job_description"),
    )

    # The invite URL goes back to the caller: the Next layer has already
    # verified the caller owns this role, and hirers legitimately share
    # the link through their own channels (LinkedIn DM etc.) when email
    # delivery isn't enough.
    return {
        "assessment_id": assessment["id"],
        "invite_url": invite_url,
        "invite_sent": invite_sent,
        "created": created,
        "candidate_email": email,
    }


# ─── JD file upload (hirer) ────────────────────────────────────────────────
# Hirers can upload the job description as a file (PDF / .docx / .txt / .md)
# instead of pasting it. The endpoint extracts text, then runs the hybrid
# safety gate (agents/jd_validate): deterministic regex + JD-likeness scorer
# corroborating a Haiku classifier. Confirmed injection attempts follow the
# tiered strike policy — block + security_events strike + admin alert first,
# auto-suspend on the second corroborated attempt within the window.

_MAX_JD_UPLOAD_BYTES = 10 * 1024 * 1024  # same ceiling as CV uploads
_JD_TEXT_LIMIT = 20000                    # CreateRoleRequest.job_description cap
# Hard word ceiling on the parsed text, enforced BEFORE the classifier is
# called: real JDs run 300–1,500 words, so 5,000 is generous headroom while
# refusing to spend LLM tokens on a book-length upload. Distinct from
# _JD_TEXT_LIMIT (silent char truncation for near-misses) — blowing past the
# word ceiling is a rejection, not a trim.
_JD_MAX_WORDS = 5000
_JD_STRIKE_KIND = "jd_injection_attempt"
_JD_STRIKE_WINDOW_DAYS = 30
_JD_STRIKES_TO_SUSPEND = 2

# Legacy pre-2007 Word (.doc) is an OLE compound file. We don't parse it —
# conversion is one "Save As" away — but we recognise it to give a precise,
# kind message instead of a generic "unsupported format".
_OLE_MAGIC = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"

_JD_UNSUPPORTED_DETAIL = (
    "We can accept PDF, Word (.docx), .txt or .md files. That file looks "
    "like something else — you can also paste the job description directly."
)

_JD_NOT_A_JD_DETAIL = (
    "This doesn't look like a job description, have you uploaded something "
    "else by mistake?"
)

_INJECTION_BLOCKED_DETAIL = (
    "This document contains content that attempts to manipulate our AI "
    "systems, and has been declined. The incident has been logged for "
    "review — if you believe this is a mistake, contact support@basanite.co.uk."
)

_SUSPENDED_DETAIL = (
    "Repeated attempts to manipulate our AI systems were detected, and your "
    "account has been suspended pending review. Contact "
    "support@basanite.co.uk to resolve this."
)


def _extract_jd_text(data: bytes, filename: str) -> str:
    """Sniff the upload's real format and extract text, or raise a kind
    HTTPException. Magic bytes are authoritative; the filename is only a
    hint for the text path (same rationale as the CV endpoint)."""
    from core.docx import DocxExtractError, extract_docx_text
    from core.pdf import extract_pdf_text
    from core.textfile import TextDecodeError, decode_text_file, normalize_text

    if data[:4] == b"%PDF":
        try:
            return normalize_text(extract_pdf_text(data))
        except Exception as e:
            print(f"  [jd-upload] pdf parse failed: {e}")
            raise HTTPException(
                status_code=422,
                detail="We couldn't read that PDF. Try re-exporting it, or paste the text instead.",
            )

    if data[:4] == b"PK\x03\x04":
        try:
            return normalize_text(extract_docx_text(data))
        except DocxExtractError as e:
            raise HTTPException(status_code=415, detail=e.detail)

    if data[:8] == _OLE_MAGIC:
        raise HTTPException(
            status_code=415,
            detail=(
                "That looks like an older Word format (.doc). Please re-save "
                "it as .docx or PDF and try again."
            ),
        )

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in ("txt", "md", "markdown", "text"):
        try:
            return decode_text_file(data)
        except TextDecodeError as e:
            raise HTTPException(status_code=422, detail=e.detail)

    raise HTTPException(status_code=415, detail=_JD_UNSUPPORTED_DETAIL)


def _log_subpunitive_injection_finding(
    user_id: str, org_id: str | None, filename: str, verdict: dict,
    *, kind: str = _JD_STRIKE_KIND,
) -> None:
    """Audit-log 'suspicious'-grade findings (or regex hits the classifier
    judged benign) that were allowed through. Non-punitive, best-effort."""
    if verdict.get("injection_risk") != "suspicious" and not verdict.get("regex_markers"):
        return
    from core.db import log_security_event
    from core.email import send_ops_alert
    log_security_event(
        user_id=user_id, org_id=org_id, kind=kind,
        severity="info",
        detail={
            "filename": (filename or "")[:200],
            "injection_risk": verdict.get("injection_risk"),
            "regex_markers": [m[:200] for m in (verdict.get("regex_markers") or [])[:10]],
            "action": "allowed",
        },
    )
    # Every security_events row should reach the admin inbox — strikes and
    # suspensions already alert in _handle_jd_injection_strike; this covers
    # the sub-punitive findings that were allowed through.
    send_ops_alert(
        "Suspicious JD upload allowed through (sub-punitive)",
        f"user_id: {user_id}\nfilename: {(filename or '')[:200]}\n"
        f"injection_risk: {verdict.get('injection_risk')}\n"
        f"Review: /dashboard/admin/security",
    )


async def _handle_injection_strike(
    user_id: str, org_id: str | None, filename: str, verdict: dict,
    *, kind: str = _JD_STRIKE_KIND, label: str = "JD",
) -> None:
    """Record a corroborated injection attempt and escalate per the tiered
    policy. Always raises (403) — the upload never proceeds.

    Shared by the hirer JD path and the candidate CV path; `kind` keys the
    strike counter (per source, so JD and CV strikes don't cross-count)
    and `label` only shapes the ops-alert wording.
    """
    from core.db import (
        count_recent_security_events,
        log_security_event,
        set_user_suspended,
    )
    from core.email import send_ops_alert

    detail = {
        "filename": filename[:200],
        "injection_risk": verdict.get("injection_risk"),
        "confidence": verdict.get("confidence"),
        "evidence": [e[:300] for e in (verdict.get("injection_evidence") or [])[:10]],
        "regex_markers": [m[:200] for m in (verdict.get("regex_markers") or [])[:10]],
    }
    log_security_event(
        user_id=user_id, org_id=org_id, kind=kind,
        severity="strike", detail=detail,
    )

    strikes = count_recent_security_events(
        user_id, kind, severity="strike", days=_JD_STRIKE_WINDOW_DAYS,
    )
    # count_recent... returns 0 on DB failure; treat the strike just
    # logged as the floor so a read hiccup can't skip straight past the
    # warning tier, and never suspends on its own.
    strikes = max(strikes, 1)

    if strikes >= _JD_STRIKES_TO_SUSPEND:
        suspended = set_user_suspended(
            user_id, True, reason=f"Repeated {label} prompt-injection attempts",
        )
        if suspended:
            log_security_event(
                user_id=user_id, org_id=org_id, kind=kind,
                severity="suspension",
                detail={"strikes": strikes, "window_days": _JD_STRIKE_WINDOW_DAYS},
            )
        send_ops_alert(
            f"Account auto-suspended: repeated {label} injection attempts",
            f"user_id: {user_id}\nstrikes in window: {strikes}\n"
            f"evidence: {detail['evidence']}\nReview: /dashboard/admin/security",
        )
        raise HTTPException(status_code=403, detail=_SUSPENDED_DETAIL)

    send_ops_alert(
        f"{label} injection attempt blocked (strike 1)",
        f"user_id: {user_id}\nfilename: {detail['filename']}\n"
        f"evidence: {detail['evidence']}\nReview: /dashboard/admin/security",
    )
    raise HTTPException(status_code=403, detail=_INJECTION_BLOCKED_DETAIL)


class _JdMetaRequest(BaseModel):
    job_description: str = Field(min_length=1, max_length=20000)


@app.post("/roles/extract-meta")
async def extract_role_meta(
    body: _JdMetaRequest,
    request: Request,
    authorization: str | None = Header(default=None),
):
    """Pull a suggested role title + company name from a pasted/uploaded JD
    so the role-creation form can autofill empty fields. Best-effort:
    returns empty strings rather than erroring so the UX never blocks."""
    _verify_internal(authorization)
    _rate_limit(request, bucket="jd-extract-meta", max_requests=120, window_seconds=3600)
    from agents.jd_meta import extract_jd_meta
    return await extract_jd_meta(body.job_description)


@app.post("/roles/jd-upload")
async def jd_upload(
    request: Request,
    file: UploadFile = File(...),
    user_id: str = Form(...),
    org_id: str | None = Form(default=None),
    authorization: str | None = Header(default=None),
):
    """Extract + validate JD text from an uploaded file. The extracted text
    is returned to the role-creation wizard, which keeps it editable and
    submits it through the normal POST /roles path."""
    _verify_internal(authorization)
    # Belt-and-braces alongside the Next.js per-user cap: parsing and the
    # classifier call are the expensive parts worth throttling per IP.
    _rate_limit(request, bucket="jd-upload", max_requests=60, window_seconds=3600)

    from core.textfile import looks_like_readable_text
    from agents.jd_validate import (
        is_confirmed_injection,
        is_confirmed_not_jd,
        validate_jd,
    )

    data = await _read_bounded(file, _MAX_JD_UPLOAD_BYTES)
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    text = _extract_jd_text(data, file.filename or "")

    if not text or len(text) < 80:
        raise HTTPException(
            status_code=422,
            detail=(
                "That file didn't contain enough readable text (it may be a "
                "scan). Try a different export, or paste the text instead."
            ),
        )
    if not looks_like_readable_text(text):
        raise HTTPException(
            status_code=422,
            detail=(
                "We couldn't extract readable text from that file — it may "
                "use unusual fonts or be corrupted. Try re-exporting it, or "
                "paste the text directly."
            ),
        )

    # Cost guard: refuse book-length documents outright before any LLM
    # call. A JD is never 5,000+ words; silently trimming one of those
    # would classify (and bill) a fragment of the wrong document.
    word_count = len(text.split())
    if word_count > _JD_MAX_WORDS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"That document is about {word_count:,} words — far longer "
                f"than any job description (limit {_JD_MAX_WORDS:,}). Please "
                "upload just the job description, or paste the relevant text."
            ),
        )

    truncated = len(text) > _JD_TEXT_LIMIT
    if truncated:
        text = text[:_JD_TEXT_LIMIT].rstrip()

    verdict = await validate_jd(text)

    if is_confirmed_injection(verdict):
        await _handle_injection_strike(
            user_id, org_id, file.filename or "", verdict,
        )

    # Sub-punitive findings ('suspicious' grade, or regex hits the
    # classifier judged benign) pass through — downstream prompt assembly
    # sanitises markers anyway — but leave an audit trail.
    _log_subpunitive_injection_finding(user_id, org_id, file.filename or "", verdict)

    if is_confirmed_not_jd(verdict):
        raise HTTPException(status_code=422, detail=_JD_NOT_A_JD_DETAIL)

    return {
        "jd_text": text,
        "char_count": len(text),
        "truncated": truncated,
        "document_type": verdict.get("document_type"),
    }


# ─── Assessment (candidate-facing) ─────────────────────────────────────────

@app.get("/assess/{token}")
async def get_assessment_info(token: str, request: Request):
    """Public endpoint, returns role info for the assessment landing page."""
    # ENG-34: belt-and-braces alongside the Next.js layer's 60/hr/IP cap.
    # Direct FastAPI calls (e.g. by an attacker harvesting tokens leaked
    # in screen-share recordings) get the same throttle.
    _rate_limit(request, bucket="assess-landing", max_requests=60, window_seconds=3600)
    from core.db import get_role_by_token
    role = get_role_by_token(token)
    if not role:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if role["status"] != "live":
        raise HTTPException(status_code=410, detail="This assessment is no longer accepting candidates")
    dims = _coerce_json_field(role.get("dimensions", []))
    if not isinstance(dims, list):
        dims = []
    return {
        "role_title": role["title"],
        "company_name": role.get("company_name"),
        "dimensions_count": len(dims),
        "interview_duration_minutes": role.get("interview_duration_minutes") or 15,
    }


class StartAssessmentRequest(BaseModel):
    candidate_user_id: str = Field(min_length=1, max_length=64)
    candidate_name: str = Field(min_length=1, max_length=200)
    candidate_email: str = Field(min_length=3, max_length=320)
    cv_text: str = Field(min_length=1, max_length=80000)


# ─── CV intake validation (candidate) ──────────────────────────────────────
# Candidate CV text gets the same hybrid safety gate as hirer JD uploads
# (agents/cv_validate): deterministic regex + CV-likeness/gibberish scoring
# corroborating a Haiku classifier. Confirmed injection attempts follow the
# same tiered strike policy as JD uploads, counted under a separate kind so
# JD and CV strikes never cross-count. Enforced both at /cv-upload (fast UX
# feedback on the parsed PDF) and at /start (the authoritative gate — the
# cv_text body field is client-controlled and can bypass the upload path).

_CV_STRIKE_KIND = "cv_injection_attempt"
_CV_HARMFUL_KIND = "cv_harmful_content"

_CV_NOT_A_CV_DETAIL = (
    "This doesn't look like a CV — please check you've uploaded the right "
    "document."
)

_CV_HARMFUL_BLOCKED_DETAIL = (
    "This document contains content we can't accept, and has been declined. "
    "The incident has been logged for review — if you believe this is a "
    "mistake, contact support@basanite.co.uk."
)


async def _enforce_cv_verdict(
    user_id: str | None, filename: str, verdict: dict
) -> None:
    """Apply a CV validation verdict: strike on confirmed injection, block
    harmful content, bounce confirmed non-CVs/gibberish, and audit-log
    sub-punitive findings that pass through. Raises on any rejection."""
    from agents.cv_validate import (
        is_confirmed_harmful,
        is_confirmed_injection,
        is_confirmed_not_cv,
    )

    if is_confirmed_injection(verdict):
        if user_id:
            await _handle_injection_strike(
                user_id, None, filename, verdict,
                kind=_CV_STRIKE_KIND, label="CV",
            )
        # No attributable account (shouldn't happen behind the Next.js
        # proxy, which requires a candidate session) — still refuse.
        raise HTTPException(status_code=403, detail=_INJECTION_BLOCKED_DETAIL)

    if is_confirmed_harmful(verdict):
        from core.db import log_security_event
        from core.email import send_ops_alert
        if user_id:
            log_security_event(
                user_id=user_id, kind=_CV_HARMFUL_KIND, severity="strike",
                detail={
                    "filename": (filename or "")[:200],
                    "evidence": [e[:300] for e in (verdict.get("harmful_evidence") or [])[:10]],
                },
            )
        send_ops_alert(
            "Harmful CV content blocked",
            f"user_id: {user_id}\nfilename: {(filename or '')[:200]}\n"
            f"evidence: {[e[:300] for e in (verdict.get('harmful_evidence') or [])[:10]]}\n"
            "Review: /dashboard/admin/security",
        )
        raise HTTPException(status_code=403, detail=_CV_HARMFUL_BLOCKED_DETAIL)

    # Sub-punitive findings ('suspicious' grade, or regex hits the
    # classifier judged benign) pass through — downstream prompt assembly
    # sanitises markers anyway — but leave an audit trail.
    if user_id:
        _log_subpunitive_injection_finding(
            user_id, None, filename, verdict, kind=_CV_STRIKE_KIND,
        )

    if is_confirmed_not_cv(verdict):
        raise HTTPException(status_code=422, detail=_CV_NOT_A_CV_DETAIL)


@app.post("/assess/{token}/cv-upload")
async def cv_upload(
    token: str,
    request: Request,
    file: UploadFile = File(...),
    user_id: str | None = Form(default=None),
    authorization: str | None = Header(default=None),
):
    """
    Extract text from an uploaded CV (PDF for now). The extracted text is
    returned to the client, which then POSTs it to /assess/{token}/start
    alongside the other assessment bootstrap fields.
    """
    # SEC-01: this endpoint feeds `user_id` straight into the injection
    # strike ladder (_enforce_cv_verdict -> set_user_suspended), so it must
    # only be reachable through the Next.js proxy, which overwrites user_id
    # with the verified candidate session before forwarding here. Without
    # this, anyone who knows a victim's user_id and a live assessment token
    # could call this endpoint directly (FastAPI is publicly reachable, see
    # PIPELINE_PUBLIC_URL) and force strikes onto an account they don't own.
    _verify_internal(authorization)
    # ENG-34: cap CV-upload attempts per IP. PDF parsing is expensive;
    # without this an attacker armed with a leaked token could exhaust
    # the worker pool by feeding malformed PDFs in a tight loop.
    # Per-IP; all candidates share the Vercel egress IP (proxy drops the
    # real client IP), so keep this above realistic cohort size or it
    # throttles a whole hiring batch rather than an attacker.
    _rate_limit(request, bucket="cv-upload", max_requests=120, window_seconds=3600)
    from core.db import get_role_by_token
    role = get_role_by_token(token)
    if not role or role["status"] != "live":
        raise HTTPException(status_code=404, detail="Assessment not found or not active")

    data = await _read_bounded(file, _MAX_CV_BYTES)
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    # The %PDF magic bytes are the authoritative signal — a non-PDF cannot
    # forge them and still be parseable by pypdf. The browser/OS-reported
    # Content-Type and even the filename are unreliable (real PDFs arrive as
    # application/octet-stream, an empty type, or vendor variants depending
    # on platform), so gating on them only rejected legitimate CVs. Resource
    # limits (size cap in _read_bounded, bounded extraction in core.pdf, and
    # the per-IP rate limit above) carry the abuse-defence load, not the
    # Content-Type check.
    is_pdf = data[:4] == b"%PDF"
    if not is_pdf:
        raise HTTPException(
            status_code=415,
            detail="That doesn't look like a PDF. Upload a PDF, or paste the CV text directly.",
        )

    try:
        # ENG-35: use the bounded extractor so a compression-bomb PDF
        # can't blow up the worker. The file-size cap above is the first
        # line of defence; this caps the post-decompression size too.
        from core.pdf import extract_pdf_text
        text = extract_pdf_text(data)
    except Exception as e:
        print(f"  [cv-upload] pdf parse failed: {e}")
        raise HTTPException(status_code=422, detail="We couldn't read that PDF. Paste the text instead.")

    if not text or len(text) < 80:
        raise HTTPException(
            status_code=422,
            detail="That PDF didn't contain enough readable text (it may be a scan). Paste the CV text instead.",
        )

    # Content gate: is this actually a CV, and is it clean? Fast feedback
    # here; /start re-validates as the authoritative enforcement point.
    from agents.cv_validate import validate_cv
    verdict = await validate_cv(text)
    await _enforce_cv_verdict(user_id, file.filename or "", verdict)

    return {"cv_text": text, "char_count": len(text)}


@app.post("/assess/{token}/start")
async def start_assessment(
    token: str,
    body: StartAssessmentRequest,
    request: Request,
    authorization: str | None = Header(default=None),
):
    # SEC-01: same reasoning as cv-upload above — candidate_user_id feeds
    # the injection strike ladder, so this endpoint must only be reachable
    # through the Next.js proxy (which rejects any candidate_user_id that
    # doesn't match the verified session) rather than trusting a client-
    # supplied field directly.
    _verify_internal(authorization)
    # ENG-34: cap assessment-start attempts per IP. Each /start mints
    # state, charges Haiku for CV extraction, and (once ENG-24 lands in
    # prod) creates a unique-index entry.
    # NOTE: candidates reach this through the Vercel proxy, which does NOT
    # forward the real client IP, so EVERY candidate shares one Vercel
    # egress IP here (and a co-located cohort shares one office NAT IP too).
    # A low per-IP cap therefore throttles a whole hiring batch, not an
    # attacker. The Next.js layer already caps per authenticated user
    # (start:${user.id}, 5/hr), which is the real anti-harvest guard; this
    # per-IP bucket stays only as generous defense-in-depth.
    _rate_limit(request, bucket="assess-start", max_requests=120, window_seconds=3600)
    """Create an assessment and extract CV. Returns assessment_id."""
    from core.db import (
        get_role_by_token,
        create_assessment,
        update_assessment,
        create_interview_session,
        get_interview_session,
        get_active_assessment_for_candidate,
        get_pending_invited_assessment,
    )
    from agents.cv_extract import extract_cv
    from agents.cv_validate import validate_cv
    from interview import assemble_interview_prompt

    role = get_role_by_token(token)
    if not role or role["status"] != "live":
        raise HTTPException(status_code=404, detail="Assessment not found or not active")

    # Authoritative CV content gate. cv_text arrives in the request body,
    # so a hostile client can skip /cv-upload entirely — validation must
    # happen here, BEFORE any assessment state is minted, or a rejected
    # payload would leave an orphaned assessment row behind.
    verdict = await validate_cv(body.cv_text)
    await _enforce_cv_verdict(body.candidate_user_id, "(cv text)", verdict)

    # ENG-24: refuse to start a second interview if this candidate already
    # has an in_progress or completed assessment for this role. The partial
    # unique index in migration 038 is the DB-level enforcement; this check
    # is the friendly 409 path so the candidate sees a clear message
    # instead of a generic 500 from the constraint violation.
    if body.candidate_user_id:
        existing = get_active_assessment_for_candidate(role["id"], body.candidate_user_id)
        if existing:
            raise HTTPException(
                status_code=409,
                detail="An assessment already exists for this candidate on this role.",
            )

    # Invited candidates (hirer email invite / ATS sync) already have a
    # claimed pending row for this role — update it in place so the hirer
    # queue shows ONE row per candidate progressing pending → cv_uploaded
    # → … → completed, not an orphaned "invited" row plus a real one.
    invited = (
        get_pending_invited_assessment(role["id"], body.candidate_user_id)
        if body.candidate_user_id else None
    )
    if invited:
        ok = update_assessment(
            invited["id"],
            candidate_name=body.candidate_name,
            candidate_email=body.candidate_email,
            status="cv_uploaded",
        )
        if not ok:
            raise HTTPException(status_code=500, detail="Failed to start assessment")
        assessment = invited
    else:
        # Create assessment. `is_mock` is stamped here, once, from the role
        # the link resolved to (designated test role + env gate) — every
        # downstream consumer reads this stored flag, never client input.
        assessment = create_assessment({
            "role_id": role["id"],
            "candidate_user_id": body.candidate_user_id,
            "candidate_name": body.candidate_name,
            "candidate_email": body.candidate_email,
            "status": "cv_uploaded",
            "is_mock": _is_test_mode_role(role["id"]),
        })
        if not assessment:
            raise HTTPException(status_code=500, detail="Failed to create assessment")

    # Extract CV
    cv_extracted = await extract_cv(body.cv_text, role["job_description"])
    update_assessment(
        assessment["id"],
        cv_extracted=json.dumps(cv_extracted),
        experience_path=cv_extracted.get("experience_path", "path_a"),
    )

    # Create interview session. The ATS invite path pre-creates a session
    # shell at webhook time; don't insert a second row for it.
    if not (invited and get_interview_session(assessment["id"])):
        create_interview_session(assessment["id"])

    # Assemble the role+candidate-specific interview prompt. We pass the
    # signup-typed name as the canonical identity since CV extraction
    # often misses or garbles the name field.
    full_prompt = assemble_interview_prompt(role, cv_extracted, candidate_name=body.candidate_name)

    return {
        "assessment_id": assessment["id"],
        "cv_extracted": cv_extracted,
        "experience_path": cv_extracted.get("experience_path"),
    }


_EL_API = "https://api.elevenlabs.io/v1"


def _coerce_json_field(value):
    """
    Normalize a possibly-double-encoded JSONB field into its Python value.
    Some legacy rows stored JSON as a string (double-encoded); tolerate both.
    """
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return value
    return value


def _el_headers() -> dict:
    key = os.getenv("ELEVENLABS_API_KEY", "")
    if not key:
        raise HTTPException(status_code=500, detail="ELEVENLABS_API_KEY not configured")
    return {"xi-api-key": key}


def _load_assessment_for_token(token: str, assessment_id: str):
    from core.db import get_role_by_token, get_assessment
    role = get_role_by_token(token)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    assessment = get_assessment(assessment_id)
    if not assessment or assessment["role_id"] != role["id"]:
        raise HTTPException(status_code=404, detail="Assessment not found")
    cv = assessment.get("cv_extracted", {})
    if isinstance(cv, str):
        cv = json.loads(cv)
    return role, assessment, cv


@app.post("/assess/{token}/voice-session")
async def voice_session(token: str, body: dict, request: Request):
    """
    Prepare a fresh ElevenLabs conversation: mint a signed WebSocket URL and
    return the per-session overrides (system prompt + first message) the
    browser SDK will send when it opens the socket.
    """
    # ENG-34: each /voice-session burns an ElevenLabs signed URL. Per-IP,
    # but all candidates share the Vercel egress IP (proxy drops the real
    # client IP) and reconnects multiply calls, so keep this well above
    # cohort size or a batch of candidates throttles itself; per-user
    # limiting upstream is the real guard.
    _rate_limit(request, bucket="voice-session", max_requests=120, window_seconds=3600)
    import httpx
    from core.db import update_assessment
    from interview import assemble_interview_prompt

    assessment_id = body.get("assessment_id")
    if not assessment_id:
        raise HTTPException(status_code=400, detail="Missing assessment_id")

    role, assessment, cv = _load_assessment_for_token(token, assessment_id)
    # Normalize JSONB fields that may have been stored double-encoded on legacy rows.
    role["dimensions"] = _coerce_json_field(role.get("dimensions", [])) or []
    if not isinstance(role["dimensions"], list):
        role["dimensions"] = []
    role["eligibility_constraints"] = _coerce_json_field(role.get("eligibility_constraints", {})) or {}

    agent_id = os.getenv("ELEVENLABS_AGENT_ID", "")
    if not agent_id:
        raise HTTPException(status_code=500, detail="ELEVENLABS_AGENT_ID not configured")

    async with httpx.AsyncClient(timeout=15.0) as http:
        resp = await http.get(
            f"{_EL_API}/convai/conversation/get-signed-url",
            params={"agent_id": agent_id},
            headers=_el_headers(),
        )
    if resp.status_code != 200:
        # Never log vendor response bodies — they can echo request params,
        # agent IDs, or partial auth headers into aggregated logs.
        print(f"  [voice-session] signed-url failed: status={resp.status_code}")
        raise HTTPException(status_code=502, detail="Failed to obtain voice session")
    signed_url = resp.json().get("signed_url")

    # Resolve the candidate's name with the same priority as the prompt:
    # signup-typed name > CV-extracted > generic "there". This is what Baz
    # uses for the opening line and as the name passed into the system
    # prompt's candidate_context block.
    canonical_name = assessment.get("candidate_name") or cv.get("name") or ""
    # Test Mode: mock sessions get the small-talk prompt instead of the
    # real interview. Keyed off the stored is_mock flag, never the client.
    if assessment.get("is_mock"):
        from interview import assemble_smalltalk_prompt
        prompt = assemble_smalltalk_prompt(candidate_name=canonical_name)
    else:
        prompt = assemble_interview_prompt(role, cv, candidate_name=canonical_name)
    first_name = (canonical_name or "there").split()[0]
    first_message = (
        f"Hi {first_name}, I'm Baz, I'll be your interviewer today. "
        f"Can you let me know if you can hear me clearly?"
    )

    if assessment.get("status") == "cv_uploaded":
        update_assessment(
            assessment_id,
            status="in_progress",
            started_at=datetime.now(timezone.utc).isoformat(),
        )

    duration_minutes = role.get("interview_duration_minutes") or 15
    max_duration_seconds = int(duration_minutes) * 60

    # Per-role voice override. If the role has interviewer_voice_id set
    # AND it's still in the curated catalogue or the role's org has it as
    # a cloned voice, surface it so the browser can pass it via
    # overrides.tts.voiceId to the ElevenLabs SDK at session start.
    # Otherwise omit and ElevenLabs uses the agent default — handles the
    # case where a hirer soft-deletes a cloned voice while a candidate is
    # mid-flight.
    from core.voices import is_valid_voice
    role_voice_id = role.get("interviewer_voice_id")
    role_org_id = role.get("org_id")
    voice_id = role_voice_id if (role_voice_id and is_valid_voice(role_voice_id, org_id=role_org_id)) else None

    payload: dict = {
        "signed_url": signed_url,
        "first_message": first_message,
        "max_duration_seconds": max_duration_seconds,
    }
    # ENG-31: prefer the webhook flow when configured. The browser gets
    # an opaque session_token; ElevenLabs fetches the real prompt server-
    # to-server. Until the ElevenLabs admin step (Conversation Initiation
    # Webhook URL) is done, the env var stays unset and we fall back to
    # the legacy prompt-on-browser path so candidates can still interview.
    if _USE_PROMPT_WEBHOOK:
        payload["session_token"] = _mint_session_prompt_token(assessment_id)
    else:
        # Legacy path. The prompt + role JD + custom_instructions are
        # visible in the candidate's network tab. Tracked as ENG-31; this
        # branch will be removed once the webhook is configured.
        payload["prompt"] = prompt
    if voice_id:
        payload["voice_id"] = voice_id
    return payload


# ─── ElevenLabs Conversation Initiation Webhook (ENG-31) ───────────────────
# Configured at the agent level in the ElevenLabs UI:
#   Settings → Security → Conversation Initiation Webhook URL
#   = https://api.basanite.co.uk/elevenlabs/conv-init
#   = (shared secret stored in ELEVENLABS_WEBHOOK_SECRET on both sides)
#
# When a candidate's browser opens a WebSocket, ElevenLabs forwards the
# `dynamicVariables` payload (which contains our signed session_token)
# to this endpoint. We verify the token, regenerate the system prompt
# server-side from the assessment row, and return the overrides JSON.
# The prompt never leaves the server.

@app.post("/elevenlabs/conv-init")
async def elevenlabs_conv_init(request: Request):
    """Resolve a per-session token to the system prompt + first message.

    Authenticated via:
    1. ElevenLabs HMAC signature on the request body (when configured),
       which proves the request originated from ElevenLabs and not from
       a candidate trying to harvest prompts.
    2. The session_token itself, signed by us at /voice-session and
       carrying a 1-hour TTL.
    """
    body_bytes = await request.body()

    # Verify ElevenLabs signature when the shared secret is configured.
    # ElevenLabs sends the header as `t=<unix>,v0=<hex_hmac>`. We compute
    # HMAC over `<unix>.<body>` and compare in constant time.
    if _ELEVENLABS_WEBHOOK_SECRET:
        sig_header = request.headers.get("ElevenLabs-Signature", "")
        ok = False
        try:
            parts = dict(p.split("=", 1) for p in sig_header.split(",") if "=" in p)
            ts = parts.get("t", "")
            their_sig = parts.get("v0", "")
            if ts and their_sig:
                signed = f"{ts}.{body_bytes.decode('utf-8', errors='replace')}"
                expected = hmac.new(
                    _ELEVENLABS_WEBHOOK_SECRET.encode("utf-8"),
                    signed.encode("utf-8"),
                    hashlib.sha256,
                ).hexdigest()
                ok = hmac.compare_digest(expected, their_sig)
                # Replay-window: reject anything older than 5 minutes.
                if ok:
                    try:
                        ts_int = int(ts)
                        now_ts = int(datetime.now(timezone.utc).timestamp())
                        if abs(now_ts - ts_int) > 300:
                            ok = False
                    except ValueError:
                        ok = False
        except Exception:
            ok = False
        if not ok:
            raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        payload = json.loads(body_bytes)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # ElevenLabs nests our dynamicVariables under
    # conversation_initiation_client_data.dynamic_variables. Tolerate a
    # couple of shapes since the field has shifted across SDK versions.
    client_data = (
        payload.get("conversation_initiation_client_data")
        or payload.get("client_data")
        or {}
    )
    dynamic_vars = client_data.get("dynamic_variables") or client_data.get("dynamicVariables") or client_data
    session_token = (
        dynamic_vars.get("session_token")
        if isinstance(dynamic_vars, dict)
        else None
    )
    if not session_token:
        raise HTTPException(status_code=400, detail="Missing session_token")

    assessment_id = _verify_session_prompt_token(session_token)
    if not assessment_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session_token")

    # Regenerate the prompt from authoritative DB state. We don't trust
    # any field carried in the webhook body other than the verified
    # assessment_id from the signed token.
    from core.db import get_assessment, get_role
    from interview import assemble_interview_prompt

    assessment = get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    role = get_role(assessment["role_id"])
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    role["dimensions"] = _coerce_json_field(role.get("dimensions", [])) or []
    if not isinstance(role["dimensions"], list):
        role["dimensions"] = []
    role["eligibility_constraints"] = _coerce_json_field(role.get("eligibility_constraints", {})) or {}

    cv = assessment.get("cv_extracted") or {}
    if isinstance(cv, str):
        try:
            cv = json.loads(cv)
        except Exception:
            cv = {}

    canonical_name = assessment.get("candidate_name") or cv.get("name") or ""
    # Test Mode: mock sessions get the small-talk prompt instead of the
    # real interview. Keyed off the stored is_mock flag, never the client.
    if assessment.get("is_mock"):
        from interview import assemble_smalltalk_prompt
        prompt = assemble_smalltalk_prompt(candidate_name=canonical_name)
    else:
        prompt = assemble_interview_prompt(role, cv, candidate_name=canonical_name)
    first_name = (canonical_name or "there").split()[0]
    first_message = (
        f"Hi {first_name}, I'm Baz, I'll be your interviewer today. "
        f"Can you let me know if you can hear me clearly?"
    )

    # Shape matches ElevenLabs' agent overrides schema.
    return {
        "type": "conversation_initiation_client_data",
        "conversation_config_override": {
            "agent": {
                "prompt": {"prompt": prompt},
                "first_message": first_message,
            },
        },
    }


@app.get("/voices")
async def list_voices(authorization: str | None = Header(default=None)):
    """Curated catalogue of selectable interviewer voices.

    Internal endpoint — only the dashboard's voice picker calls this, and
    only via the Next.js side that already presents the pipeline secret.
    The frontend currently mirrors the catalogue locally (web/lib/voices.ts)
    for instant render, but having the catalogue available server-side
    keeps a single source of truth available for any future UX that does
    fetch it dynamically.
    """
    _verify_internal(authorization)
    from core.voices import catalogue

    return {"voices": catalogue()}


# ─── Per-org cloned interviewer voices (ElevenLabs IVC) ────────────────────
# Hirers record themselves once; we send the audio to ElevenLabs Instant
# Voice Cloning, persist the resulting voice_id against their org, and
# expose it through the picker alongside the curated catalogue. The voice
# behaves identically to a catalogue voice from the live session's POV —
# overrides.tts.voiceId at session start is the same code path either way.

# Hard cap on cloned voices per org so a runaway hirer can't burn through
# our ElevenLabs voice slots. 5 is generous for a small team.
_MAX_CUSTOM_VOICES_PER_ORG = 5
# ENG-47: tightened from 5 MB → 2 MB. The product enforces a 30–90s
# voice-clone duration client-side; on the server we don't parse the
# audio (no ffprobe / mutagen-webm support) so we approximate by file
# size. At typical voice bitrates (Opus 64–192 kbps, which is what the
# browser MediaRecorder produces for WebM) 90 seconds is ≤ ~2 MB. The
# old 5 MB cap allowed roughly 10 minutes of audio through, which the
# UI never produces and ElevenLabs would happily charge for. The min
# (50 KB) catches near-empty uploads — a 30s clip even at low quality
# is at least ~150 KB.
_MAX_VOICE_CLONE_BYTES = 2 * 1024 * 1024
_MIN_VOICE_CLONE_BYTES = 50 * 1024
# Standard preview line synthesised once per cloned voice, served from
# the org-voice-samples Supabase Storage bucket. Mirror of the line used
# by scripts/generate_voice_samples.py for the curated voices.
_VOICE_PREVIEW_LINE = (
    "Hi, I'm Baz. I'll be conducting your interview today. "
    "Let me know if you can hear me clearly."
)


@app.get("/voices/custom")
async def list_custom_voices(
    user_id: str,
    authorization: str | None = Header(default=None),
):
    """List the calling user's org's cloned voices."""
    _verify_internal(authorization)
    from core import db

    org_id = db.get_or_create_personal_org(user_id)
    if not org_id:
        return {"voices": []}
    rows = db.list_org_custom_voices(org_id)
    return {"voices": rows, "org_id": org_id}


@app.delete("/voices/custom/{custom_voice_id}")
async def delete_custom_voice(
    custom_voice_id: str,
    user_id: str,
    authorization: str | None = Header(default=None),
):
    """Soft-delete a cloned voice. Retention sweep finalises the cascade
    to ElevenLabs after a 30-day grace window."""
    _verify_internal(authorization)
    from core import db

    org_id = db.get_or_create_personal_org(user_id)
    if not org_id:
        raise HTTPException(status_code=404, detail="Voice not found")
    # ENG-61: 404 for both "doesn't exist" and "not in your org" so a
    # probing caller can't enumerate other orgs' voice IDs by timing
    # or response shape. The DB-side update touches zero rows in
    # either case; this branch turns that into the correct status.
    ok = db.soft_delete_org_custom_voice(custom_voice_id, org_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Voice not found")
    return {"ok": True}


@app.post("/voices/clone")
async def clone_voice(
    audio: UploadFile = File(...),
    name: str = Form(min_length=1, max_length=80),
    description: str | None = Form(default=None, max_length=200),
    user_id: str = Form(min_length=1, max_length=64),
    consent_user_agent: str | None = Form(default=None, max_length=400),
    authorization: str | None = Header(default=None),
):
    """Clone a hirer voice via ElevenLabs IVC + persist + log consent.

    Multipart fields:
      audio              — the recording (audio/webm or audio/mpeg)
      name               — display label, e.g. "Drew"
      description        — optional, e.g. "CTO, Manchester"
      user_id            — hirer's auth.users id (sets org + created_by)
      consent_user_agent — UA string captured from the consent screen
    """
    _verify_internal(authorization)
    from core import db

    org_id = db.get_or_create_personal_org(user_id)
    if not org_id:
        raise HTTPException(status_code=500, detail="Failed to resolve org")

    # Per-org cap.
    existing = db.list_org_custom_voices(org_id)
    if len(existing) >= _MAX_CUSTOM_VOICES_PER_ORG:
        raise HTTPException(
            status_code=400,
            detail=f"You've hit the limit of {_MAX_CUSTOM_VOICES_PER_ORG} cloned voices. Delete an existing voice first.",
        )

    # Bounded read.
    audio_bytes = await _read_bounded(audio, _MAX_VOICE_CLONE_BYTES)
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio")

    # ENG-47: server-side bounds approximating the 30–90s duration cap.
    # The browser already enforces it but we don't trust the client.
    if len(audio_bytes) < _MIN_VOICE_CLONE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Recording too short. Please record at least 30 seconds.",
        )

    # ENG-36: validate the magic bytes before forwarding to ElevenLabs.
    # Trust nothing about the client-supplied filename or content_type
    # — those are decorative. Same defence pattern as ENG-27 on
    # /upload-recording. Whitelisted formats:
    #   WebM/Matroska  EBML magic        \x1a\x45\xdf\xa3
    #   WAV            "RIFF....WAVE"
    #   MP3            "ID3" or 0xff 0xfb (MPEG audio frame sync)
    #   Ogg            "OggS"
    if not _is_supported_voice_audio(audio_bytes):
        raise HTTPException(
            status_code=415,
            detail="Unsupported audio format. Use WebM, WAV, MP3, or Ogg.",
        )

    # ElevenLabs IVC.
    eleven_voice_id = await _eleven_clone_voice(
        name=name,
        description=description,
        audio=audio_bytes,
        filename=audio.filename or "sample.webm",
        content_type=audio.content_type or "audio/webm",
    )

    # Persist (without sample_url initially — we'll patch it in below).
    row = db.create_org_custom_voice(
        org_id=org_id,
        eleven_voice_id=eleven_voice_id,
        name=name,
        description=description,
        created_by=user_id,
    )
    if not row:
        # ElevenLabs already created the voice; this is a best-effort
        # cleanup so we don't leak slots. Failing the cleanup is non-fatal.
        try:
            await _eleven_delete_voice(eleven_voice_id)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Failed to persist voice")

    # Generate + upload a preview MP3 so the picker has something to play.
    # If this fails, the voice is still usable; the picker will just hide
    # the play button until a future retry. Best-effort, never blocking.
    try:
        sample_url = await _generate_and_upload_preview(eleven_voice_id)
        if sample_url:
            db.update_org_custom_voice(row["id"], org_id, sample_url=sample_url)
            row["sample_url"] = sample_url
    except Exception as e:
        print(f"  [voices/clone] preview generation failed (non-fatal): {type(e).__name__}: {e}")

    # Log consent (Article 7 burden-of-proof).
    try:
        db.log_consent(
            user_id=user_id,
            consent_type="voice_clone_self_consent",
            granted=True,
            policy_version="2026-05-02",
            user_agent=consent_user_agent,
        )
    except Exception as e:
        print(f"  [voices/clone] consent log failed (non-fatal): {type(e).__name__}: {e}")

    return {"voice": row}


async def _eleven_clone_voice(
    *, name: str, description: str | None, audio: bytes, filename: str, content_type: str
) -> str:
    """POST to ElevenLabs /v1/voices/add. Returns the new voice_id."""
    import httpx

    api_key = os.getenv("ELEVENLABS_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="ELEVENLABS_API_KEY not configured")

    files = [("files", (filename, audio, content_type))]
    data: dict = {"name": name}
    if description:
        data["description"] = description

    async with httpx.AsyncClient(timeout=60.0) as http:
        resp = await http.post(
            "https://api.elevenlabs.io/v1/voices/add",
            headers={"xi-api-key": api_key},
            files=files,
            data=data,
        )
    if resp.status_code == 401:
        # Most common cause: API key missing voices_write permission.
        raise HTTPException(
            status_code=503,
            detail="Voice cloning isn't enabled for this account. Contact support.",
        )
    if resp.status_code >= 400:
        # Don't echo vendor body wholesale (may include the audio filename
        # or other PII fragments). Log a short version for ops.
        body_preview = (resp.text or "")[:240]
        print(f"  [voices/clone] elevenlabs {resp.status_code}: {body_preview}")
        raise HTTPException(status_code=502, detail="Voice clone failed at the upstream step.")

    payload = resp.json()
    voice_id = payload.get("voice_id")
    if not voice_id:
        raise HTTPException(status_code=502, detail="Voice clone returned no voice_id")
    return voice_id


async def _eleven_delete_voice(eleven_voice_id: str) -> None:
    """Free a cloned voice slot at ElevenLabs. Used by retention sweep."""
    import httpx

    api_key = os.getenv("ELEVENLABS_API_KEY", "")
    if not api_key:
        return
    async with httpx.AsyncClient(timeout=20.0) as http:
        await http.delete(
            f"https://api.elevenlabs.io/v1/voices/{eleven_voice_id}",
            headers={"xi-api-key": api_key},
        )


async def _generate_and_upload_preview(eleven_voice_id: str) -> str | None:
    """Synthesise the standard preview line in this voice and upload to
    Supabase Storage. Returns the public URL or None on failure."""
    import httpx

    api_key = os.getenv("ELEVENLABS_API_KEY", "")
    if not api_key:
        return None

    async with httpx.AsyncClient(timeout=30.0) as http:
        resp = await http.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{eleven_voice_id}",
            headers={"xi-api-key": api_key, "Content-Type": "application/json"},
            json={
                "text": _VOICE_PREVIEW_LINE,
                "model_id": "eleven_turbo_v2_5",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
            },
        )
    if resp.status_code >= 400:
        return None
    audio = resp.content

    # Upload to Supabase Storage (public bucket org-voice-samples).
    from core.db import get_client
    client = get_client()
    if not client:
        return None
    path = f"{eleven_voice_id}.mp3"
    try:
        client.storage.from_("org-voice-samples").upload(
            path,
            audio,
            {"content-type": "audio/mpeg", "upsert": "true"},
        )
        # Build a public URL. The bucket should be marked public via the
        # Supabase dashboard once on first use.
        public = client.storage.from_("org-voice-samples").get_public_url(path)
        return public
    except Exception as e:
        print(f"  [voices/clone] storage upload failed: {type(e).__name__}: {e}")
        return None


@app.post("/assess/{token}/director")
async def director_tick(
    token: str,
    body: dict,
    authorization: str | None = Header(default=None),
):
    """
    One pass of the Director supervisor. Returns a short tactical directive the
    live client can forward to the ElevenLabs agent via sendContextualUpdate.

    Requires the internal pipeline secret. The candidate's browser must NOT
    call this endpoint directly — it goes through the Next.js wrapper, which
    authenticates the candidate, rate-limits per user, and forwards the
    secret. Without the secret check here, a public attacker holding a
    leaked assessment_link_token could spam Opus calls (ENG-17).
    """
    _verify_internal(authorization)

    from interview import director_directive

    assessment_id = body.get("assessment_id")
    if not assessment_id:
        raise HTTPException(status_code=400, detail="Missing assessment_id")

    role, assessment, cv = _load_assessment_for_token(token, assessment_id)
    role["dimensions"] = _coerce_json_field(role.get("dimensions", [])) or []
    if not isinstance(role["dimensions"], list):
        role["dimensions"] = []

    # Test Mode: nothing to supervise in a small-talk session, and a
    # Director directive would push the agent back toward evaluative
    # questioning. Skip (and save the Opus call).
    if assessment and assessment.get("is_mock"):
        return {"skip": True, "reason": "test_mode"}

    raw_messages = body.get("messages") or []
    messages: list[dict] = []
    for m in raw_messages[-120:]:
        if not isinstance(m, dict):
            continue
        r = m.get("role")
        c = (m.get("content") or "").strip()
        if r in ("user", "assistant") and c:
            messages.append({"role": r, "content": c})

    # ENG-23: timing must be enforced server-side. The client used to send
    # `elapsed_seconds`, but a tampered browser could under-report time to
    # keep the interview running past the role's duration cap (and keep
    # burning Opus on Director ticks). We derive elapsed from the
    # assessment's `started_at` timestamp instead, and refuse Director
    # work past the role's cap plus a 10-minute buffer.
    started_at_raw = assessment.get("started_at") if assessment else None
    if not started_at_raw:
        # No started_at means the candidate hasn't started yet — Director
        # has nothing to supervise.
        return {"skip": True}
    try:
        started_at = datetime.fromisoformat(str(started_at_raw).replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return {"skip": True}
    elapsed_seconds = int((datetime.now(timezone.utc) - started_at).total_seconds())
    if elapsed_seconds < 0:
        elapsed_seconds = 0

    duration_minutes = role.get("interview_duration_minutes") or 15
    hard_ceiling_seconds = int(duration_minutes) * 60 + 600  # +10 min buffer
    if elapsed_seconds > hard_ceiling_seconds:
        return {"skip": True, "reason": "past_duration_cap"}

    result = await director_directive(role, cv, messages, elapsed_seconds)
    if not result:
        return {"skip": True}
    return {
        "skip": False,
        "directive": result["directive"],
        "reasoning": result.get("reasoning", ""),
    }


@app.post("/assess/{token}/upload-recording")
async def upload_recording(
    token: str,
    request: Request,
    assessment_id: str = Form(...),
    file: UploadFile = File(...),
):
    """Store the full-session webm recording in Supabase Storage."""
    # ENG-34: matches the Next.js cap. Recording uploads are large (up
    # to 200MB) and trigger storage writes; 5/hr/IP keeps abusive
    # uploads from saturating the bucket while leaving room for the
    # legitimate single-recording-per-interview pattern + retries.
    _rate_limit(request, bucket="upload-recording", max_requests=5, window_seconds=3600)
    from core.db import get_client

    role, _assessment, _cv = _load_assessment_for_token(token, assessment_id)

    data = await _read_bounded(file, _MAX_RECORDING_BYTES)
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload")
    # ENG-27: content validation. Trust nothing from the client about the
    # file's nature — verify the magic bytes match WebM/EBML before
    # storing. Tiny payloads are rejected too; a legitimate recording is
    # always at least a few KB even for the shortest interview.
    if len(data) < _MIN_RECORDING_BYTES:
        raise HTTPException(status_code=400, detail="Recording too small")
    if not data.startswith(_WEBM_MAGIC):
        raise HTTPException(
            status_code=400,
            detail="Unsupported recording format (expected WebM)",
        )

    client = get_client()
    if not client:
        raise HTTPException(status_code=500, detail="Storage not configured")

    # ENG-46: include a high-entropy random suffix in the path so the
    # storage URL can't be guessed from the assessment_id alone. Storage
    # RLS deny-all (mig 025) is the primary defence; this is belt-and-
    # braces for the case where a future signed-URL feature accidentally
    # exposes paths or the bucket policy is loosened.
    #
    # If the assessment already has a recording_path, reuse its random
    # suffix so a re-upload (network blip, retry) overwrites the same
    # blob rather than orphaning the previous one.
    from core.db import get_assessment, update_assessment
    existing = get_assessment(assessment_id) or {}
    existing_path = existing.get("recording_path") or ""
    if existing_path.startswith(f"{assessment_id}/"):
        recording_path = existing_path
    else:
        suffix = secrets.token_urlsafe(12)
        recording_path = f"{assessment_id}/{suffix}/session.webm"

    try:
        client.storage.from_("interview-recordings").upload(
            path=recording_path,
            file=data,
            file_options={"content-type": "video/webm", "upsert": "true"},
        )
    except Exception as e:
        print(f"  [upload-recording] storage upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to store recording")

    # Persist the path so the retention sweep and the finalize step can
    # find it. Best-effort — failure here means the file is uploaded but
    # the row isn't pointed at it; retention will treat it as orphan and
    # is_complete will fail upstream, both visible and recoverable.
    try:
        update_assessment(assessment_id, recording_path=recording_path)
    except Exception as e:
        print(f"  [upload-recording] db update failed: {e}")

    return {"recording_path": recording_path}


@app.post("/assess/{token}/finalize")
async def finalize_voice_session(token: str, body: dict):
    """
    After the ElevenLabs call ends: poll for the final transcript, write it
    into the interview session, stamp the recording path, and kick off reports.
    """
    import httpx
    from core.db import (
        get_interview_session,
        update_interview_session,
        update_assessment,
    )
    from interview import (
        normalize_elevenlabs_messages,
        generate_reports,
    )

    assessment_id = body.get("assessment_id")
    conversation_id = body.get("conversation_id")
    recording_path = body.get("recording_path")

    if not assessment_id or not conversation_id:
        raise HTTPException(status_code=400, detail="Missing assessment_id or conversation_id")

    # conversation_id is interpolated into the ElevenLabs URL; constrain to the
    # charset ElevenLabs actually uses so a malicious client can't inject
    # path segments (e.g. "../agents/X") to reach unintended endpoints.
    import re as _re
    if not _re.fullmatch(r"[A-Za-z0-9_-]{1,128}", str(conversation_id)):
        raise HTTPException(status_code=400, detail="Invalid conversation_id")

    role, _assessment, cv = _load_assessment_for_token(token, assessment_id)

    transcript: list[dict] = []
    status = "unknown"
    async with httpx.AsyncClient(timeout=15.0) as http:
        # ElevenLabs needs a moment to finalize the conversation after the call ends.
        for _ in range(15):
            resp = await http.get(
                f"{_EL_API}/convai/conversations/{conversation_id}",
                headers=_el_headers(),
            )
            if resp.status_code == 200:
                payload = resp.json()
                status = payload.get("status", "")
                if status == "done":
                    transcript = payload.get("transcript", []) or []
                    break
                if status == "failed":
                    break
            await asyncio.sleep(2)

    messages = normalize_elevenlabs_messages(transcript)

    session = get_interview_session(assessment_id)
    if session:
        # supabase-py serializes the list to JSONB natively; don't double-encode.
        update_interview_session(
            session["id"],
            messages=messages,
            current_phase="complete",
            updated_at=datetime.now(timezone.utc).isoformat(),
        )

    update_fields = {
        "status": "completed",
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }
    if recording_path:
        update_fields["recording_path"] = recording_path
    update_assessment(assessment_id, **update_fields)

    # Test Mode: mock sessions never generate reports — no rows land in
    # `reports` or `dimension_scores`. The completion flow above still
    # ran, so the tester sees the normal completion screen.
    if messages and not _assessment.get("is_mock"):
        asyncio.create_task(generate_reports(assessment_id, role, cv))

    return {
        "status": "finalizing",
        "transcript_status": status,
        "message_count": len(messages),
    }


@app.post("/assess/{token}/complete")
async def complete_assessment(
    token: str,
    body: dict,
):
    """Finalize an assessment and trigger report generation."""
    from core.db import get_role_by_token, get_assessment, update_assessment
    from interview import generate_reports

    assessment_id = body.get("assessment_id")
    if not assessment_id:
        raise HTTPException(status_code=400, detail="Missing assessment_id")

    role = get_role_by_token(token)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    assessment = get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    cv_extracted = assessment.get("cv_extracted", {})
    if isinstance(cv_extracted, str):
        cv_extracted = json.loads(cv_extracted)

    # Mark completed
    update_assessment(
        assessment_id,
        status="completed",
        completed_at=datetime.now(timezone.utc).isoformat(),
    )

    # Generate reports in background. Test Mode: mock sessions skip this
    # entirely — no reports, no dimension_scores.
    if not assessment.get("is_mock"):
        asyncio.create_task(generate_reports(assessment_id, role, cv_extracted))

    return {"status": "completing", "assessment_id": assessment_id}


def _build_report_pdf(assessment_id: str, report_type: str) -> tuple[bytes, str]:
    """Assemble the PDF and an appropriate filename for a given assessment report."""
    from core.db import get_assessment, get_role, get_report
    from core.pdf import render_report_pdf

    if report_type not in ("hirer", "candidate"):
        raise HTTPException(status_code=400, detail="Invalid report type")

    assessment = get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    role = get_role(assessment["role_id"])
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    report = get_report(assessment_id, report_type)
    if not report or not report.get("content"):
        raise HTTPException(status_code=404, detail="Report not ready yet")

    pdf_bytes = render_report_pdf(
        report_type=report_type,
        role_title=role.get("title") or "the role",
        candidate_name=assessment.get("candidate_name") or "Candidate",
        report=report["content"],
    )

    safe_candidate = "".join(c if c.isalnum() or c in "-_" else "-" for c in (assessment.get("candidate_name") or "candidate")).strip("-")[:60] or "candidate"
    filename = f"basanite-{report_type}-{safe_candidate}.pdf"
    return pdf_bytes, filename


@app.get("/assess/{token}/report/{report_type}/pdf")
async def download_assessment_report_pdf(
    token: str,
    report_type: str,
    assessment_id: str,
    request: Request,
    x_accessed_by: str | None = Header(default=None, alias="X-Accessed-By"),
):
    """Candidate-facing: download a PDF of their report. Token + assessment_id must match.

    Candidates may only download their own `candidate` report. The hirer
    report is confidential (contains grading, quotation_basis, internal
    notes) and must be fetched via the authenticated hirer-only route
    `/reports/{assessment_id}/{report_type}/pdf`.
    """
    from fastapi.responses import Response
    from core.db import get_role_by_token, get_assessment, log_report_access

    if report_type != "candidate":
        raise HTTPException(status_code=404, detail="Report not found")

    role = get_role_by_token(token)
    if not role:
        raise HTTPException(status_code=404, detail="Assessment not found")
    assessment = get_assessment(assessment_id)
    if not assessment or assessment["role_id"] != role["id"]:
        raise HTTPException(status_code=404, detail="Assessment not found for this link")

    pdf_bytes, filename = _build_report_pdf(assessment_id, report_type)
    # ENG-42: audit who reads what. Best-effort — a failure here doesn't
    # block delivering the PDF to the candidate.
    log_report_access(
        assessment_id=assessment_id,
        report_type=report_type,
        access_kind="candidate-self",
        accessed_by=x_accessed_by or assessment.get("candidate_user_id"),
        ip_hash=_hash_request_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )


@app.get("/reports/{assessment_id}/{report_type}/pdf")
async def download_internal_report_pdf(
    assessment_id: str,
    report_type: str,
    request: Request,
    authorization: str | None = Header(default=None),
    x_accessed_by: str | None = Header(default=None, alias="X-Accessed-By"),
    x_access_kind: str | None = Header(default=None, alias="X-Access-Kind"),
):
    """Hirer-facing (via Next.js auth proxy): download a PDF by assessment_id.

    The Next.js proxy already resolved the hirer's auth.users.id and
    forwards it as X-Accessed-By so we can attribute the audit row to a
    person, not just "the pipeline".

    The candidate portal reuses this route (its Next.js proxy verifies the
    assessment belongs to the signed-in candidate) and sends
    X-Access-Kind: candidate-self so the audit row is attributed correctly.
    Portal access is restricted to the candidate report — the hirer report
    is confidential.
    """
    _verify_internal(authorization)
    from fastapi.responses import Response
    from core.db import log_report_access

    access_kind = x_access_kind if x_access_kind in ("hirer-dashboard", "candidate-self") else "hirer-dashboard"
    if access_kind == "candidate-self" and report_type != "candidate":
        raise HTTPException(status_code=404, detail="Report not found")

    pdf_bytes, filename = _build_report_pdf(assessment_id, report_type)
    # ENG-42: hirer audit trail. accessed_by may be None if a script
    # calls the route directly with the pipeline secret; that's still
    # captured (NULL) and surfaced as "internal-pipeline" in the DSAR.
    log_report_access(
        assessment_id=assessment_id,
        report_type=report_type,
        access_kind=access_kind,
        accessed_by=x_accessed_by,
        ip_hash=_hash_request_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )


@app.get("/assess/{token}/report/{report_type}")
async def get_assessment_report(
    token: str,
    report_type: str,
):
    """Get a generated report (hirer or candidate)."""
    from core.db import get_report

    if report_type not in ("hirer", "candidate"):
        raise HTTPException(status_code=400, detail="Invalid report type")

    # We need to find the assessment_id, for now, accept it as query param
    # In production, this would be derived from the authenticated user
    from fastapi import Query
    # Simplified: report lookup by assessment_id passed in body
    # TODO: proper auth-based lookup
    return {"error": "Use the Next.js API routes with proper auth for report access"}


# ─── ATS integration (Merge.dev) ───────────────────────────────────────────
# These routes are called by the Next.js dashboard on the hirer's behalf.
# Auth is the same internal pipeline secret as everywhere else; the user
# identity is forwarded in the request body (the Next.js side has resolved
# it from the Supabase session before calling here).


class _AtsLinkTokenRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)
    user_email: str = Field(min_length=3, max_length=320)
    name_hint: str | None = Field(default=None, max_length=200)


@app.post("/ats/link-token")
async def ats_create_link_token(
    body: _AtsLinkTokenRequest,
    authorization: str | None = Header(default=None),
):
    """
    Mint a Merge Link Token for the calling hirer's org. The Next.js side
    feeds this into Merge's React component (or hosted Magic Link page) to
    let the hirer pick + auth their ATS. Returns the link_token plus the
    org_id we resolved for it (so the frontend can show which workspace
    the connection belongs to).
    """
    _verify_internal(authorization)
    from core import db, ats

    org_id = db.get_or_create_personal_org(body.user_id, body.name_hint)
    if not org_id:
        raise HTTPException(status_code=500, detail="Failed to resolve org")

    try:
        client = ats.merge_client()
        result = client.ats.link_token.create(
            end_user_email_address=body.user_email,
            end_user_organization_name=(body.name_hint or "Basanite hirer")[:200],
            end_user_origin_id=org_id,
            categories=["ats"],
        )
    except Exception as e:
        print(f"  [ats] link_token.create failed: {type(e).__name__}: {e}")
        raise HTTPException(status_code=502, detail="Merge link-token request failed")

    return {
        "link_token": getattr(result, "link_token", None),
        "magic_link_url": getattr(result, "magic_link_url", None),
        "org_id": org_id,
    }


class _AtsExchangeRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)
    user_email: str = Field(min_length=3, max_length=320)
    public_token: str = Field(min_length=10, max_length=500)


@app.post("/ats/exchange")
async def ats_exchange(
    body: _AtsExchangeRequest,
    authorization: str | None = Header(default=None),
):
    """
    Exchange the short-lived public_token (handed to us by Merge after the
    hirer completes the Magic Link flow) for the long-lived account_token,
    encrypt it, and persist as an ats_connections row for the hirer's org.
    """
    _verify_internal(authorization)
    from core import db, ats

    org_id = db.get_or_create_personal_org(body.user_id)
    if not org_id:
        raise HTTPException(status_code=500, detail="Failed to resolve org")

    try:
        client = ats.merge_client()
        token_resp = client.ats.account_token.retrieve(public_token=body.public_token)
        account_token = getattr(token_resp, "account_token", None)
        if not account_token:
            raise RuntimeError("Merge returned no account_token")

        # Identify the integration so we can show it in the UI.
        scoped = ats.merge_client(account_token=account_token)
        details = scoped.ats.account_details.retrieve()
        integration = getattr(details, "integration", None)
        provider_slug = getattr(integration, "slug", None) or "unknown"
    except Exception as e:
        print(f"  [ats] exchange failed: {type(e).__name__}: {e}")
        raise HTTPException(status_code=502, detail="Merge token exchange failed")

    encrypted = ats.encrypt_token(account_token)
    saved = db.upsert_ats_connection(
        org_id=org_id,
        account_token_encrypted=encrypted,
        provider=provider_slug,
        end_user_origin_id=org_id,
        end_user_email=body.user_email,
    )
    if not saved:
        raise HTTPException(status_code=500, detail="Failed to persist connection")

    return {
        "connection_id": saved["id"],
        "provider": provider_slug,
        "org_id": org_id,
    }


@app.get("/ats/connections")
async def ats_list_connections(
    user_id: str,
    authorization: str | None = Header(default=None),
):
    """List the calling hirer's org's ATS connections (no token values)."""
    _verify_internal(authorization)
    from core import db

    org_id = db.get_or_create_personal_org(user_id)
    if not org_id:
        return {"connections": [], "org_id": None}
    return {
        "connections": db.get_ats_connections_for_org(org_id),
        "org_id": org_id,
    }


@app.delete("/ats/connections/{connection_id}")
async def ats_delete_connection(
    connection_id: str,
    user_id: str,
    authorization: str | None = Header(default=None),
):
    """
    Mark a connection 'disconnected'. We don't hard-delete the row so we
    keep an audit trail (and so the unique partial index lets a fresh
    connection be created right after). The Merge linked-account itself
    stays — call client.ats.linked_accounts.delete on it if you want to
    revoke server-side too (out of scope for v1).
    """
    _verify_internal(authorization)
    from core import db

    # Verify the connection belongs to the caller's org before nuking it.
    org_id = db.get_or_create_personal_org(user_id)
    conn = db.get_ats_connection(connection_id)
    if not conn or conn.get("org_id") != org_id:
        raise HTTPException(status_code=404, detail="Connection not found")

    ok = db.mark_ats_connection_disconnected(connection_id)
    return {"ok": ok}


# ─── ATS jobs + mappings (PR4) ─────────────────────────────────────────────


@app.get("/ats/jobs")
async def ats_list_jobs(
    user_id: str,
    authorization: str | None = Header(default=None),
):
    """
    List jobs from the hirer's connected ATS via Merge. The dashboard uses
    this to populate the job-mapping UI: pick an ATS job, pair it with a
    Basanite role, and from then on applications to that ATS job auto-create
    Basanite assessments.
    """
    _verify_internal(authorization)
    from core import db, ats

    org_id = db.get_or_create_personal_org(user_id)
    if not org_id:
        return {"jobs": [], "connected": False}

    connections = db.get_ats_connections_for_org(org_id)
    active = next((c for c in connections if c.get("status") == "connected"), None)
    if not active:
        return {"jobs": [], "connected": False}

    full = db.get_ats_connection(active["id"])
    if not full:
        return {"jobs": [], "connected": False}

    try:
        token = ats.decrypt_token(full["account_token_encrypted"])
        client = ats.merge_client(account_token=token)
        # Merge paginates jobs; for v1 we only show the first page (≤100).
        # Hirers with more than 100 active reqs are an edge case until we
        # add server-side search.
        resp = client.ats.jobs.list(page_size=100, status="OPEN")
        items = list(getattr(resp, "results", None) or [])
    except Exception as e:
        print(f"  [ats] jobs.list failed: {type(e).__name__}: {e}")
        raise HTTPException(status_code=502, detail="Could not fetch ATS jobs")

    jobs = []
    for j in items:
        jobs.append({
            "merge_job_id": getattr(j, "id", None),
            "remote_job_id": getattr(j, "remote_id", None),
            "name": getattr(j, "name", None),
            "status": getattr(j, "status", None),
            "departments": [getattr(d, "name", None) for d in (getattr(j, "departments", None) or [])],
        })
    return {"jobs": jobs, "connected": True, "connection_id": active["id"]}


class _AtsJobMappingRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)
    merge_job_id: str = Field(min_length=1, max_length=200)
    remote_job_id: str | None = Field(default=None, max_length=200)
    job_name: str | None = Field(default=None, max_length=300)
    role_id: str = Field(min_length=1, max_length=64)
    auto_invite: bool = True


@app.post("/ats/job-mappings")
async def ats_create_job_mapping(
    body: _AtsJobMappingRequest,
    authorization: str | None = Header(default=None),
):
    _verify_internal(authorization)
    from core import db

    org_id = db.get_or_create_personal_org(body.user_id)
    if not org_id:
        raise HTTPException(status_code=500, detail="Failed to resolve org")

    role = db.get_role(body.role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    role_org = role.get("org_id")
    role_user = role.get("user_id")
    # Soft check: legacy roles may be missing org_id (RLS-transitional).
    # Block obvious cross-org attempts.
    if role_org is not None and role_org != org_id:
        raise HTTPException(status_code=403, detail="Role not in your org")
    if role_org is None and role_user != body.user_id:
        raise HTTPException(status_code=403, detail="Role not in your org")

    connections = db.get_ats_connections_for_org(org_id)
    active = next((c for c in connections if c.get("status") == "connected"), None)
    if not active:
        raise HTTPException(status_code=400, detail="No active ATS connection")

    saved = db.upsert_ats_job_mapping(
        connection_id=active["id"],
        org_id=org_id,
        merge_job_id=body.merge_job_id,
        remote_job_id=body.remote_job_id,
        job_name=body.job_name,
        role_id=body.role_id,
        auto_invite=body.auto_invite,
    )
    if not saved:
        raise HTTPException(status_code=500, detail="Failed to save mapping")
    return {"mapping": saved}


@app.get("/ats/job-mappings")
async def ats_list_job_mappings(
    user_id: str,
    authorization: str | None = Header(default=None),
):
    _verify_internal(authorization)
    from core import db

    org_id = db.get_or_create_personal_org(user_id)
    if not org_id:
        return {"mappings": []}
    return {"mappings": db.get_ats_job_mappings_for_org(org_id)}


@app.delete("/ats/job-mappings/{mapping_id}")
async def ats_delete_job_mapping(
    mapping_id: str,
    user_id: str,
    authorization: str | None = Header(default=None),
):
    _verify_internal(authorization)
    from core import db

    org_id = db.get_or_create_personal_org(user_id)
    if not org_id:
        raise HTTPException(status_code=404, detail="Mapping not found")
    ok = db.delete_ats_job_mapping(mapping_id, org_id)
    return {"ok": ok}


# ─── ATS feature flags (PR7 dark-launch) ───────────────────────────────────


class _AtsFlagRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)
    enabled: bool


@app.post("/ats/flags/push")
async def ats_set_push_flag(
    body: _AtsFlagRequest,
    authorization: str | None = Header(default=None),
):
    """Toggle the org's ats_push_enabled flag. Until True, push_results
    runs in dry-run mode (logs intent, doesn't write to the customer's ATS)."""
    _verify_internal(authorization)
    from core import db

    org_id = db.get_or_create_personal_org(body.user_id)
    if not org_id:
        raise HTTPException(status_code=500, detail="Failed to resolve org")
    ok = db.set_org_feature_flag(org_id, "ats_push_enabled", body.enabled)
    return {"ok": ok, "enabled": body.enabled}


@app.get("/ats/flags")
async def ats_get_flags(
    user_id: str,
    authorization: str | None = Header(default=None),
):
    _verify_internal(authorization)
    from core import db

    org_id = db.get_or_create_personal_org(user_id)
    if not org_id:
        return {"flags": {}}
    return {"flags": db.get_org_feature_flags(org_id)}


# ─── ATS inbound webhook (PR5) ─────────────────────────────────────────────


@app.post("/ats/webhook/merge")
async def ats_webhook_merge(request: Request):
    """
    Inbound Merge webhook. Verifies HMAC, deduplicates via event_id, parses
    the event type, and on `Application.created` pulls the candidate +
    resume from Merge and creates a Basanite assessment with a unique invite
    link, optionally emailing the candidate.

    Critical correctness properties:
      - The handler ALWAYS returns 200 quickly; failures are logged and
        emailed to the founder, not bubbled to Merge (which would retry and
        spam the candidate). The only time we 4xx is on bad signature / no
        body, which Merge SHOULD see as a configuration error.
      - Idempotent on event_id. Re-deliveries are a no-op.
      - Idempotent on merge_application_id via the unique index — the second
        delivery for the same application updates the existing assessment row
        rather than creating a duplicate.
    """
    raw = await request.body()
    sig = request.headers.get("x-merge-webhook-signature", "")
    from core import ats, db
    from core.email import send_invite_email

    if not raw:
        raise HTTPException(status_code=400, detail="Empty body")
    if not ats.verify_webhook_signature(raw, sig):
        # Don't leak whether the secret is misconfigured vs a forgery.
        raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        payload = json.loads(raw.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed JSON")

    # Merge event identifier — see https://docs.merge.dev for the canonical
    # field. We accept the documented `webhook_id` first, then `id`, then
    # synthesize from delivery time + linked-account so we never silently
    # double-process an event without an id (the synth key is stable per
    # delivery because Merge sends `delivery_timestamp` on each fire).
    event_id = (
        payload.get("webhook_id")
        or payload.get("id")
        or f"{payload.get('delivery_timestamp', '')}-{payload.get('linked_account', {}).get('id', '')}"
    )
    if not event_id or event_id == "-":
        # Best-effort: log without idempotency.
        event_id = f"unknown-{datetime.now(timezone.utc).isoformat()}"

    hook_type = payload.get("hook", {}).get("event") or payload.get("event") or payload.get("type")
    linked_account_id = (payload.get("linked_account") or {}).get("id")

    # ENG-55: atomic dedup. The old check-then-act pattern
    # (webhook_event_seen → log_webhook_event) had a TOCTOU window
    # that let two concurrent deliveries of the same event_id both
    # proceed. claim_webhook_event uses the UNIQUE constraint on
    # event_id as the arbiter, so exactly one caller wins.
    if not db.claim_webhook_event(
        event_id, hook_type=hook_type, linked_account_id=linked_account_id
    ):
        return {"status": "duplicate", "event_id": event_id}

    # We currently care about Application created/updated. Other events are
    # acknowledged-and-ignored so Merge stops retrying.
    is_application_event = (
        hook_type
        and "application" in str(hook_type).lower()
        and ("created" in str(hook_type).lower() or "updated" in str(hook_type).lower())
    )
    if not is_application_event:
        db.log_webhook_event(
            event_id=event_id,
            hook_type=hook_type,
            linked_account_id=linked_account_id,
            status="ignored",
        )
        return {"status": "ignored", "hook": hook_type}

    try:
        result = await _handle_application_event(payload, linked_account_id)
        db.log_webhook_event(
            event_id=event_id,
            hook_type=hook_type,
            linked_account_id=linked_account_id,
            status="processed",
            payload_summary=result,
        )
        return {"status": "processed", **result}
    except Exception as e:
        msg = f"{type(e).__name__}: {e}"
        print(f"  [ats/webhook] handler raised: {msg}")
        db.log_webhook_event(
            event_id=event_id,
            hook_type=hook_type,
            linked_account_id=linked_account_id,
            status="failed",
            error_message=msg,
        )
        db.log_ats_sync_error(
            direction="inbound",
            operation="webhook.application",
            error_class=type(e).__name__,
            error_message=msg,
            context={"event_id": event_id, "linked_account_id": linked_account_id},
        )
        try:
            from core.email import send_ops_alert
            send_ops_alert(
                "Webhook handler failed",
                f"event_id={event_id}\nhook={hook_type}\nlinked_account={linked_account_id}\n{msg}",
            )
        except Exception:
            pass
        # Return 200 so Merge doesn't retry-storm us — failures are recorded.
        return {"status": "failed", "event_id": event_id}


async def _handle_application_event(payload: dict, linked_account_id: str | None) -> dict:
    """Process a Merge application.created/updated event into a Basanite
    assessment. Returns a small summary dict for logging."""
    import secrets
    from core import ats, db
    from core.email import send_invite_email

    data = payload.get("data") or {}
    # Merge wraps the model under data.model_type / data (varies by version).
    application = data.get("data") if isinstance(data.get("data"), dict) else data

    merge_application_id = application.get("id") or application.get("application")
    if not merge_application_id:
        return {"skipped": "no_application_id"}

    # Resolve the connection via linked_account_id so we know which org owns
    # this. Without this we can't decrypt the token to fetch the CV.
    connection = _find_connection_by_linked_account(linked_account_id)
    if not connection:
        # Webhook arrived before/after we have a connection record — log
        # and bail. Common during sandbox testing.
        return {"skipped": "no_connection_for_linked_account", "linked_account_id": linked_account_id}

    # Find the job mapping. If the application's job isn't mapped, ignore —
    # the customer hasn't told us they want this job assessed by Basanite.
    job_field = application.get("job")
    merge_job_id = job_field if isinstance(job_field, str) else (job_field or {}).get("id")
    if not merge_job_id:
        return {"skipped": "no_job_id", "merge_application_id": merge_application_id}

    mapping = db.get_ats_job_mapping_by_merge_job(connection["id"], merge_job_id)
    if not mapping:
        return {"skipped": "job_not_mapped", "merge_job_id": merge_job_id}

    role = db.get_role(mapping["role_id"])
    if not role:
        return {"skipped": "mapped_role_missing", "role_id": mapping["role_id"]}
    if role.get("status") != "live":
        return {"skipped": "role_not_live", "role_id": mapping["role_id"]}

    # Idempotency: same application twice updates the existing assessment.
    existing = db.get_assessment_by_merge_application(merge_application_id)
    if existing:
        return {"skipped": "already_assessed", "assessment_id": existing["id"]}

    # Fetch candidate details (name + email) from Merge.
    candidate_field = application.get("candidate")
    merge_candidate_id = candidate_field if isinstance(candidate_field, str) else (candidate_field or {}).get("id")
    candidate_name = "Candidate"
    candidate_email = ""
    if merge_candidate_id:
        try:
            token = ats.decrypt_token(connection["account_token_encrypted"])
            client = ats.merge_client(account_token=token)
            cand = client.ats.candidates.retrieve(id=merge_candidate_id)
            first = getattr(cand, "first_name", "") or ""
            last = getattr(cand, "last_name", "") or ""
            candidate_name = (f"{first} {last}".strip()) or "Candidate"
            emails = getattr(cand, "email_addresses", None) or []
            for e in emails:
                addr = getattr(e, "value", None) or getattr(e, "email_address", None)
                if addr:
                    candidate_email = addr
                    break
        except Exception as e:
            print(f"  [ats/webhook] candidate retrieve failed: {type(e).__name__}: {e}")
            db.log_ats_sync_error(
                direction="inbound",
                operation="cv_fetch.candidate",
                error_class=type(e).__name__,
                error_message=str(e),
                org_id=connection.get("org_id"),
                connection_id=connection["id"],
                context={"merge_application_id": merge_application_id, "merge_candidate_id": merge_candidate_id},
            )

    # Pull CV text from the most recent resume attachment, then run our normal
    # CV extraction so the interview prompt has structured experience data.
    cv_text = None
    cv_extracted: dict = {}
    if merge_candidate_id:
        try:
            token = ats.decrypt_token(connection["account_token_encrypted"])
            cv_text = ats.fetch_candidate_cv_text(token, merge_candidate_id)
        except Exception as e:
            db.log_ats_sync_error(
                direction="inbound",
                operation="cv_fetch.attachment",
                error_class=type(e).__name__,
                error_message=str(e),
                org_id=connection.get("org_id"),
                connection_id=connection["id"],
                context={"merge_application_id": merge_application_id, "merge_candidate_id": merge_candidate_id},
            )

    if cv_text:
        try:
            from agents.cv_extract import extract_cv
            cv_extracted = await extract_cv(cv_text, role.get("job_description", ""))
        except Exception as e:
            print(f"  [ats/webhook] cv extract failed: {type(e).__name__}: {e}")
            cv_extracted = {}

    invite_token = secrets.token_urlsafe(32)
    # ENG-30: stamp a 30-day expiry on every freshly minted invite so a
    # leaked link from a screen-share recording, mail-server backup, or
    # forwarded email stops working after the candidate's normal apply
    # window has passed.
    invite_expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    assessment_payload = {
        "role_id": role["id"],
        "candidate_user_id": f"ats:{merge_candidate_id or merge_application_id}",
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
        "status": "pending",
        "source": "ats",
        "connection_id": connection["id"],
        "merge_application_id": merge_application_id,
        "merge_candidate_id": merge_candidate_id,
        "remote_application_id": application.get("remote_id"),
        "invite_token": invite_token,
        "invite_expires_at": invite_expires_at,
    }
    if cv_extracted:
        assessment_payload["cv_extracted"] = json.dumps(cv_extracted)
        assessment_payload["experience_path"] = cv_extracted.get("experience_path", "path_a")

    created = db.create_assessment(assessment_payload)
    if not created:
        raise RuntimeError("create_assessment returned None")

    # Create the interview session shell so candidate can land on /interview.
    try:
        db.create_interview_session(created["id"])
    except Exception:
        pass

    invite_url = _build_invite_url(invite_token)

    if mapping.get("auto_invite") and candidate_email:
        try:
            send_invite_email(
                to=candidate_email,
                candidate_name=candidate_name,
                role_title=role.get("title") or "interview",
                company_name=role.get("company_name"),
                invite_url=invite_url,
                duration_minutes=role.get("interview_duration_minutes") or 30,
                role_summary=role.get("job_description"),
            )
        except Exception as e:
            print(f"  [ats/webhook] invite email failed: {type(e).__name__}: {e}")

    return {
        "assessment_id": created["id"],
        "merge_application_id": merge_application_id,
        "invite_sent": bool(mapping.get("auto_invite") and candidate_email),
    }


def _find_connection_by_linked_account(linked_account_id: str | None) -> dict | None:
    """Look up an ats_connections row by Merge's linked-account UUID.
    Stored either as account_id (we need to add this in PR3 forwards) or
    by re-fetching account_details via the encrypted token (slow).

    For v1, we walk all connected rows and probe account_details on each
    until we find a match. With <50 connections this is fast enough; we'll
    add a `linked_account_id` column when the second customer ships.
    """
    if not linked_account_id:
        return None
    from core import ats
    from core.db import get_client

    client = get_client()
    if not client:
        return None
    try:
        result = (
            client.table("ats_connections")
            .select("*")
            .eq("status", "connected")
            .execute()
        )
        rows = result.data or []
    except Exception:
        return None

    for row in rows:
        try:
            token = ats.decrypt_token(row["account_token_encrypted"])
            scoped = ats.merge_client(account_token=token)
            details = scoped.ats.account_details.retrieve()
            if getattr(details, "id", None) == linked_account_id:
                return row
        except Exception:
            continue
    return None


def _build_invite_url(invite_token: str) -> str:
    base = os.getenv("PUBLIC_APP_URL", "https://basanite.co.uk").rstrip("/")
    return f"{base}/assess/invite/{invite_token}"


# ─── Candidate invite resolution (PR6) ─────────────────────────────────────


@app.get("/assess/invite/{invite_token}")
async def get_invite_info(invite_token: str, request: Request):
    """
    Resolve a unique invite token to the underlying assessment. The candidate
    flow uses this on `/assess/invite/{token}` to skip the CV upload step
    when the assessment was pre-populated from an ATS sync.

    ENG-30: this endpoint is unauthenticated by design (the candidate
    follows the link from email). Three hardenings:

    - Per-IP rate limit (60/hr) so a leaked-token harvest can't be turned
      into bulk pipeline-membership reconnaissance.
    - 30-day expiry on freshly-minted invites (the helper rejects expired
      rows). Anyone who finds an old invite in a screen-share recording
      or mail backup gets a generic 404, not the candidate's data.
    - The unauthenticated response no longer includes candidate_name or
      candidate_email — those leaked who-was-invited-where to anyone with
      the URL. The candidate's identity is established server-side after
      sign-in via assertCandidateOwnsAssessment.
    """
    from core.db import get_assessment_by_invite_token, get_role

    _rate_limit(request, bucket="invite", max_requests=60, window_seconds=3600)

    assessment = get_assessment_by_invite_token(invite_token)
    if not assessment:
        # Covers both "never existed" and "expired". Same response either
        # way so timing-side-channel can't distinguish the two cases.
        raise HTTPException(status_code=404, detail="Invite not found")
    role = get_role(assessment["role_id"])
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role["status"] != "live":
        raise HTTPException(status_code=410, detail="This assessment is no longer accepting candidates")

    dims = _coerce_json_field(role.get("dimensions", []))
    if not isinstance(dims, list):
        dims = []

    cv = assessment.get("cv_extracted") or {}
    if isinstance(cv, str):
        try:
            cv = json.loads(cv)
        except Exception:
            cv = {}

    return {
        "assessment_id": assessment["id"],
        "role_token": role.get("assessment_link_token"),
        "role_title": role["title"],
        "company_name": role.get("company_name"),
        "dimensions_count": len(dims),
        "interview_duration_minutes": role.get("interview_duration_minutes") or 15,
        "cv_prefilled": bool(cv),
        "experience_path": assessment.get("experience_path"),
    }


class ClaimInviteRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)
    email: str = Field(min_length=3, max_length=320)


@app.post("/assess/invite/{invite_token}/claim")
async def claim_invite(
    invite_token: str,
    body: ClaimInviteRequest,
    authorization: str | None = Header(default=None),
):
    """Bind an invited assessment to the signed-in candidate's auth user.

    Called by the Next.js claim route AFTER it has verified the Supabase
    session — user_id and email here are the authenticated values, never
    client-supplied. The invited email must match the signed-in email
    (same rule as /accept-invite for org invitations) so a forwarded
    invite link can't be hijacked by whoever holds it.

    The claim is only a bind: it never consumes or rotates the token, so
    a wrong-account attempt doesn't burn the invite. Idempotent for the
    rightful owner (re-clicking the email link after claiming is a 200).
    """
    _verify_internal(authorization)
    from core.db import get_assessment_by_invite_token, get_role, update_assessment

    assessment = get_assessment_by_invite_token(invite_token)
    if not assessment:
        # Covers "never existed" and "expired" alike.
        raise HTTPException(status_code=404, detail="Invite not found")
    role = get_role(assessment["role_id"])
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role["status"] != "live":
        raise HTTPException(status_code=410, detail="This assessment is no longer accepting candidates")

    invited_email = (assessment.get("candidate_email") or "").strip().lower()
    signed_in_email = (body.email or "").strip().lower()
    if invited_email and signed_in_email != invited_email:
        raise HTTPException(
            status_code=403,
            detail="This invite was sent to a different email address. Sign in with the account that received it.",
        )

    current_owner = assessment.get("candidate_user_id")
    if current_owner and current_owner != body.user_id:
        raise HTTPException(
            status_code=403,
            detail="This invite has already been claimed by another account.",
        )

    if not current_owner:
        if not update_assessment(assessment["id"], candidate_user_id=body.user_id):
            raise HTTPException(status_code=500, detail="Failed to claim invite")

    return {
        "assessment_id": assessment["id"],
        "role_token": role.get("assessment_link_token"),
        "status": assessment.get("status"),
    }


# ─── Public report PDF (PR7) ───────────────────────────────────────────────


@app.get("/reports/public/{assessment_id}")
async def download_public_report_pdf(assessment_id: str, token: str, request: Request):
    """
    Serve the hirer report PDF when called with a valid signed `token`. The
    URL is what we drop into the ATS note so the customer's reviewers can
    open the report without a Basanite login.

    The signature is HMAC-SHA256 over `assessment_id:expires_at_unix`.
    Tokens expire 90 days after the push (configurable in core/ats.sign).
    """
    # ENG-34: rate-limit this even though tokens are HMAC-signed —
    # someone scraping ATS notes could try them all at line rate, and
    # PDF rendering is non-trivial CPU work.
    _rate_limit(request, bucket="public-report", max_requests=60, window_seconds=3600)
    from fastapi.responses import Response
    from core import ats
    from core.db import log_report_access

    if not ats.verify_public_report_url(assessment_id, token):
        raise HTTPException(status_code=403, detail="Invalid or expired link")

    pdf_bytes, filename = _build_report_pdf(assessment_id, "hirer")
    # ENG-42: signed-URL access has no authenticated user, so accessed_by
    # is null. The IP-hash + user-agent give enough fingerprint to spot
    # the pattern of "every reviewer at acme.com pulled the report" vs
    # "one outside scraper hit it 50 times".
    log_report_access(
        assessment_id=assessment_id,
        report_type="hirer",
        access_kind="public-signed-url",
        accessed_by=None,
        ip_hash=_hash_request_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    # ENG-41: harden the PDF response against framing/MIME-sniff abuse.
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
            "Content-Security-Policy": "frame-ancestors 'none'",
        },
    )


# ─── GDPR data-rights (Article 15-22) ──────────────────────────────────────
# Public-ish endpoints (verified by single-use email tokens) that let any
# data subject access, erase, object to, or rectify their personal data
# without going through a human first.
#
# Flow:
#   1. Next.js /api/data-rights creates a dsar_requests row + verification
#      token, then calls /data-rights/email-verification here to send the
#      candidate the verify link.
#   2. Candidate clicks → Next.js /data-rights/verify page server-renders
#      via /data-rights/verify here, which actions the request and returns
#      the result (or a signed export download URL).


class _DsarEmailVerifyRequest(BaseModel):
    to: str = Field(min_length=3, max_length=320)
    request_type: str = Field(min_length=1, max_length=32)
    verify_url: str = Field(min_length=1, max_length=1000)


@app.post("/data-rights/email-verification")
async def dsar_send_verification_email(
    body: _DsarEmailVerifyRequest,
    request: Request,
    authorization: str | None = Header(default=None),
):
    """Send the data subject a one-time verification link by email."""
    _verify_internal(authorization)
    from core.email import send_dsar_verification_email

    # ENG-61: defence-in-depth rate limit. The Next.js layer already
    # caps to 3/hr/email + 5/hr/IP (ENG-56), but if PIPELINE_API_SECRET
    # leaks an attacker could call here directly. Cap per recipient
    # email (5/hr) — generous for legitimate retries, tight enough to
    # blunt a leaked-secret email-bomb relay.
    _rate_limit(
        request,
        bucket=f"dsar-email:{(body.to or '').lower()}",
        max_requests=5,
        window_seconds=3600,
    )

    sent = send_dsar_verification_email(
        to=body.to,
        request_type=body.request_type,
        verify_url=body.verify_url,
    )
    return {"sent": sent}


class _DsarVerifyRequest(BaseModel):
    token: str = Field(min_length=10, max_length=200)


@app.post("/data-rights/verify")
async def dsar_verify(
    body: _DsarVerifyRequest,
    authorization: str | None = Header(default=None),
):
    """Resolve a verification token and action the corresponding DSAR.

    Returns one of:
        {"status": "completed", "request_type": ..., "download_url"?: ...}
        {"status": "pending", "request_type": ...}
        {"status": "expired"} (410)
        {"status": "invalid"} (404)
    """
    _verify_internal(authorization)
    from core.db import get_client, claim_dsar_for_action
    from datetime import datetime as _dt

    client = get_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # ENG-55: atomic claim — only the caller that flips the row from
    # 'pending' to 'verified' proceeds. The previous SELECT-then-UPDATE
    # pattern allowed two concurrent /verify calls with the same token
    # to both pass the "not yet verified" check and both run the
    # action (erasure twice, multiple fresh export URLs, etc.). The
    # token is single-use after this — even if the same caller retries,
    # the second attempt sees status != 'pending' and gets a 404.
    #
    # Pre-flight: peek at expiry so we can return a clean 410 instead
    # of a generic 404 for expired tokens. This peek isn't a TOCTOU
    # risk: if the token was already consumed concurrently, the atomic
    # update below returns None and we 404.
    #
    # ENG-60: lookup keyed on the peppered hash, not the plaintext
    # token. The DB never sees plaintext.
    from core.db import hash_auth_token
    token_hash = hash_auth_token(body.token)
    try:
        peek = (
            client.table("dsar_requests")
            .select("id, status, verification_expires_at")
            .eq("verification_token_hash", token_hash)
            .single()
            .execute()
        )
        peek_row = peek.data or {}
    except Exception:
        peek_row = {}

    expires = peek_row.get("verification_expires_at") if peek_row else None
    if expires:
        try:
            exp_dt = _dt.fromisoformat(expires.replace("Z", "+00:00"))
            if exp_dt < datetime.now(timezone.utc):
                # Best-effort status flip so the row reflects the
                # truth. Even if it races, the atomic claim below
                # protects against double-action.
                if peek_row.get("id"):
                    client.table("dsar_requests").update({"status": "expired"}).eq(
                        "id", peek_row["id"]
                    ).execute()
                raise HTTPException(status_code=410, detail="Token expired")
        except (ValueError, TypeError):
            pass

    row = claim_dsar_for_action(body.token)
    if not row:
        # Token unknown OR already consumed by a concurrent /verify
        # call OR moved to a non-pending state by an admin. Same 404
        # for all so timing-side-channel can't distinguish.
        raise HTTPException(status_code=404, detail="Token not found")

    request_type = row["request_type"]
    email = row["email"]

    if request_type == "erasure":
        _action_erasure(email)
        client.table("dsar_requests").update(
            {"status": "completed", "completed_at": "now()"}
        ).eq("id", row["id"]).execute()
        return {"status": "completed", "request_type": request_type}

    if request_type == "objection":
        _action_objection(email)
        client.table("dsar_requests").update(
            {"status": "completed", "completed_at": "now()"}
        ).eq("id", row["id"]).execute()
        return {"status": "completed", "request_type": request_type}

    if request_type == "export":
        # Mint a short-lived download token so the user can fetch the JSON.
        # Reuse the public-report URL signer but with a different prefix to
        # disambiguate. 1 hour validity.
        from core import ats
        import time as _time

        expires_at = int(_time.time()) + 3600
        sig = ats.sign_public_report_url(f"dsar:{row['id']}", expires_at)
        public_base = os.getenv("PUBLIC_APP_URL", "https://basanite.co.uk").rstrip("/")
        download_url = (
            f"{public_base}/api/data-rights/export"
            f"?dsar_id={row['id']}&expires={expires_at}&sig={sig.split('.', 1)[1]}"
        )
        client.table("dsar_requests").update(
            {"status": "completed", "completed_at": "now()"}
        ).eq("id", row["id"]).execute()
        return {
            "status": "completed",
            "request_type": request_type,
            "download_url": download_url,
        }

    # rectification / restriction → mark verified, ops actions manually.
    return {"status": "pending", "request_type": request_type}


def _action_erasure(email: str) -> None:
    """Soft-mark all assessments tied to this email for deletion. The
    retention sweep finalises the purge within 30 days.

    We don't hard-delete here for two reasons:
      (a) The retention pass is the single source of truth for when data
          actually leaves storage — easier to audit than ad-hoc deletes.
      (b) The 30-day window matches GDPR's response deadline and gives ops
          a chance to halt if a request was fraudulent.
    """
    from core.db import get_client

    client = get_client()
    if not client:
        return
    try:
        client.table("assessments").update(
            {"deletion_requested_at": "now()"}
        ).eq("candidate_email", email).execute()
    except Exception as e:
        print(f"  [dsar] erasure update failed: {type(e).__name__}: {e}")


def _action_objection(email: str) -> None:
    """Flag all assessments for this email so the hirer must apply human
    review before treating any score as a decision (Article 22)."""
    from core.db import get_client

    client = get_client()
    if not client:
        return
    try:
        client.table("assessments").update(
            {"object_to_automated_decisions": True}
        ).eq("candidate_email", email).execute()
    except Exception as e:
        print(f"  [dsar] objection update failed: {type(e).__name__}: {e}")


@app.get("/data-rights/export")
async def dsar_export(dsar_id: str, expires: int, sig: str):
    """Serve the candidate's data export. Signed URL with 1-hour TTL.

    Builds a JSON with: their assessments, transcripts, dimension scores,
    reports, consent records, and DSAR audit trail. Recordings are
    referenced by short-lived signed URLs (separate Supabase signed-URL
    flow), not embedded.
    """
    from core import ats

    # Re-build and verify signature: payload was f"dsar:{row['id']}:{expires}"
    expected = ats.sign_public_report_url(f"dsar:{dsar_id}", expires)
    expected_sig = expected.split(".", 1)[1]
    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(status_code=403, detail="Invalid signature")
    if expires < int(datetime.now(timezone.utc).timestamp()):
        raise HTTPException(status_code=410, detail="Link expired")

    payload = _build_dsar_export(dsar_id)
    body = json.dumps(payload, indent=2, default=str)
    safe_email = (payload.get("subject", {}).get("email") or "subject").replace("@", "-at-")
    filename = f"basanite-data-export-{safe_email}.json"
    from fastapi.responses import Response

    return Response(
        content=body,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/admin/retention-sweep")
async def admin_retention_sweep(authorization: str | None = Header(default=None)):
    """Run the daily data-retention sweep. Hit by a Render cron job (or
    the equivalent scheduler). Caller must present the pipeline secret;
    cron auth is its scope."""
    _verify_internal(authorization)
    from core.retention import run_retention_sweep, to_dict

    try:
        result = run_retention_sweep()
        return {"ok": True, **to_dict(result)}
    except Exception as e:
        print(f"  [retention] sweep raised: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Sweep failed")


def _build_dsar_export(dsar_id: str) -> dict:
    """Compose the JSON payload returned by GET /data-rights/export."""
    from core.db import get_client

    client = get_client()
    if not client:
        return {"error": "DB unavailable"}

    try:
        row = (
            client.table("dsar_requests")
            .select("email, created_at, request_type")
            .eq("id", dsar_id)
            .single()
            .execute()
        ).data or {}
        email = row.get("email", "")
    except Exception:
        return {"error": "DSAR not found"}

    out: dict = {
        "subject": {"email": email},
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "policy_version": "2026-05-02",
        "assessments": [],
        "consent_records": [],
        "dsar_audit_trail": [],
        # ENG-42: who has viewed your report. Article 15(1)(c) — the
        # data subject is entitled to know the recipients to whom their
        # personal data has been disclosed.
        "report_access_log": [],
    }

    # Assessments + their related rows.
    try:
        rows = (
            client.table("assessments")
            .select(
                "id, role_id, candidate_name, candidate_email, status, source, "
                "started_at, completed_at, created_at, object_to_automated_decisions, "
                "cv_extracted, dimension_scores(*), reports(*), interview_sessions(*)"
            )
            .eq("candidate_email", email)
            .execute()
        ).data or []
        out["assessments"] = rows
    except Exception as e:
        out["assessments_error"] = str(e)[:300]

    try:
        rows = (
            client.table("consent_records")
            .select("consent_type, granted, policy_version, created_at, assessment_id")
            .in_("assessment_id", [a["id"] for a in out.get("assessments", [])])
            .execute()
        ).data or []
        out["consent_records"] = rows
    except Exception:
        pass

    try:
        rows = (
            client.table("dsar_requests")
            .select("request_type, status, created_at, completed_at")
            .eq("email", email)
            .execute()
        ).data or []
        out["dsar_audit_trail"] = rows
    except Exception:
        pass

    # ENG-42: report_access_log entries for every assessment we surfaced.
    try:
        from core.db import list_report_accesses_for_assessment
        access_rows: list[dict] = []
        for a in out.get("assessments", []):
            access_rows.extend(list_report_accesses_for_assessment(a["id"]))
        out["report_access_log"] = access_rows
    except Exception:
        pass

    return out


# ─── Organisations ─────────────────────────────────────────────────────────
# Multi-org membership, settings, invitations, domain auto-join, and the
# active-org switcher. Every endpoint checks org membership via
# db.is_org_member(user_id, org_id) and additionally enforces role where
# the operation is owner/admin-only.

import secrets as _secrets
from datetime import timedelta as _timedelta


def _public_app_url() -> str:
    return (os.getenv("PUBLIC_APP_URL") or "https://basanite.co.uk").rstrip("/")


class _CreateOrgRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=500)


@app.get("/orgs")
async def orgs_list_mine(user_id: str, authorization: str | None = Header(default=None)):
    """Every org the calling user is a member of (with their role)."""
    _verify_internal(authorization)
    from core import db
    return {"orgs": db.list_orgs_for_user(user_id)}


@app.post("/orgs")
async def orgs_create(body: _CreateOrgRequest, authorization: str | None = Header(default=None)):
    """Create a new shared org. Caller becomes the owner. Used by the
    workspace switcher's 'Create organisation' flow."""
    _verify_internal(authorization)
    from core import db

    org = db.create_org(
        name=body.name.strip(),
        description=(body.description or None) and body.description.strip(),
        owner_user_id=body.user_id,
    )
    if not org:
        raise HTTPException(status_code=500, detail="Failed to create organisation")
    db.set_active_org_id(body.user_id, org["id"])
    return {"org": org}


@app.get("/orgs/active")
async def orgs_get_active(user_id: str, authorization: str | None = Header(default=None)):
    """Resolve the user's active org_id (falls back to personal org)."""
    _verify_internal(authorization)
    from core import db
    return {"active_org_id": db.get_active_org_id(user_id)}


class _SetActiveOrgRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)
    org_id: str = Field(min_length=1, max_length=64)


@app.post("/orgs/active")
async def orgs_set_active(body: _SetActiveOrgRequest, authorization: str | None = Header(default=None)):
    """Flip the user's active org. Caller must already be a member."""
    _verify_internal(authorization)
    from core import db

    if not db.is_org_member(body.user_id, body.org_id):
        raise HTTPException(status_code=403, detail="Not a member of that organisation")
    if not db.set_active_org_id(body.user_id, body.org_id):
        raise HTTPException(status_code=500, detail="Failed to switch organisation")
    return {"ok": True, "active_org_id": body.org_id}


@app.get("/orgs/{org_id}")
async def orgs_get(org_id: str, user_id: str, authorization: str | None = Header(default=None)):
    """Full settings payload for one org: profile + members + pending
    invitations. Membership-gated; owners/admins additionally see the
    invitations section."""
    _verify_internal(authorization)
    from core import db

    role = db.is_org_member(user_id, org_id)
    if not role:
        raise HTTPException(status_code=404, detail="Organisation not found")
    org = db.get_org(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    members = db.list_org_members(org_id)
    invitations: list[dict] = []
    if role in ("owner", "admin"):
        invitations = db.list_pending_invitations(org_id)
    return {
        "org": org,
        "members": members,
        "invitations": invitations,
        "viewer_role": role,
    }


class _UpdateOrgRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)
    name: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=500)
    auto_join_domain: str | None = Field(default=None, max_length=200)
    # Sentinel: if the caller wants to clear the domain, send "" rather than
    # leaving the field absent (which would mean "don't change").
    clear_auto_join_domain: bool = False


@app.patch("/orgs/{org_id}")
async def orgs_update(org_id: str, body: _UpdateOrgRequest, authorization: str | None = Header(default=None)):
    """Update org profile / domain. Owners + admins only."""
    _verify_internal(authorization)
    from core import db
    from core.orgs import is_free_email_domain

    role = db.is_org_member(body.user_id, org_id)
    if role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Owners or admins only")

    fields: dict = {}
    if body.name is not None:
        fields["name"] = body.name.strip()[:200]
    if body.description is not None:
        fields["description"] = body.description.strip()[:500] or None
    if body.clear_auto_join_domain:
        fields["auto_join_domain"] = None
    elif body.auto_join_domain is not None:
        domain = body.auto_join_domain.strip().lower()
        if not domain:
            fields["auto_join_domain"] = None
        else:
            if is_free_email_domain(domain):
                raise HTTPException(
                    status_code=400,
                    detail="That looks like a free email provider. Use a domain you own (e.g. yourcompany.com).",
                )
            # Basic shape check — at least one dot, no whitespace, no '@'.
            if "@" in domain or " " in domain or "." not in domain:
                raise HTTPException(status_code=400, detail="Invalid domain")
            fields["auto_join_domain"] = domain

    if not fields:
        return {"ok": True, "unchanged": True}
    if not db.update_org(org_id, **fields):
        raise HTTPException(status_code=500, detail="Failed to update organisation")
    return {"ok": True}


class _ChangeMemberRoleRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)
    new_role: str = Field(min_length=1, max_length=32)


@app.patch("/orgs/{org_id}/members/{member_user_id}")
async def orgs_change_member_role(
    org_id: str, member_user_id: str, body: _ChangeMemberRoleRequest,
    authorization: str | None = Header(default=None),
):
    """Owner-only role mutation. Cannot demote the last owner."""
    _verify_internal(authorization)
    from core import db

    if db.is_org_member(body.user_id, org_id) != "owner":
        raise HTTPException(status_code=403, detail="Owners only")
    if body.new_role not in ("owner", "admin", "member"):
        raise HTTPException(status_code=400, detail="Invalid role")
    # Prevent stranding the org without an owner.
    current = db.is_org_member(member_user_id, org_id)
    if current == "owner" and body.new_role != "owner" and db.count_org_owners(org_id) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Promote another member to owner before demoting yourself.",
        )
    if not db.change_org_member_role(org_id, member_user_id, body.new_role):
        raise HTTPException(status_code=500, detail="Failed to change role")
    return {"ok": True}


class _RemoveMemberRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)


@app.delete("/orgs/{org_id}/members/{member_user_id}")
async def orgs_remove_member(
    org_id: str, member_user_id: str, user_id: str,
    authorization: str | None = Header(default=None),
):
    """Remove a member. The caller is allowed to remove themselves
    (Leave organisation); otherwise must be an owner. Last owner cannot
    leave."""
    _verify_internal(authorization)
    from core import db

    caller_role = db.is_org_member(user_id, org_id)
    if not caller_role:
        raise HTTPException(status_code=403, detail="Not a member")
    is_self = user_id == member_user_id
    if not is_self and caller_role != "owner":
        raise HTTPException(status_code=403, detail="Owners only")

    target_role = db.is_org_member(member_user_id, org_id)
    if target_role == "owner" and db.count_org_owners(org_id) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Promote another owner before leaving — every organisation needs at least one owner.",
        )
    if not db.remove_org_member(org_id, member_user_id):
        raise HTTPException(status_code=500, detail="Failed to remove member")

    # If the removed user had this org active, fall their active context
    # back to their personal org so the next dashboard load makes sense.
    try:
        db.set_active_org_id(member_user_id, db.get_or_create_personal_org(member_user_id) or member_user_id)
    except Exception:
        pass

    return {"ok": True}


@app.delete("/orgs/{org_id}")
async def orgs_delete(org_id: str, user_id: str, authorization: str | None = Header(default=None)):
    """Permanently delete an org. Owner-only. Cascades to roles, voices,
    ATS connections, candidate assessments via FK ON DELETE CASCADE."""
    _verify_internal(authorization)
    from core import db

    if db.is_org_member(user_id, org_id) != "owner":
        raise HTTPException(status_code=403, detail="Owners only")
    # Refuse to delete a personal org (id == user_id) since that's where
    # this user's standalone data lives. They can rename it instead.
    if org_id == user_id:
        raise HTTPException(
            status_code=400,
            detail="Personal workspaces can't be deleted — they're tied to your account.",
        )
    if not db.delete_org(org_id):
        raise HTTPException(status_code=500, detail="Failed to delete organisation")
    return {"ok": True}


class _CreateInvitationRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)
    email: str = Field(min_length=3, max_length=320)
    role: str = Field(default="member", max_length=32)


@app.post("/orgs/{org_id}/invitations")
async def orgs_create_invitation(
    org_id: str, body: _CreateInvitationRequest,
    authorization: str | None = Header(default=None),
):
    """Mint an invitation token and email it to the recipient."""
    _verify_internal(authorization)
    from core import db
    from core.email import send_org_invitation_email

    role = db.is_org_member(body.user_id, org_id)
    if role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Owners or admins only")
    if body.role not in ("member", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    email = body.email.strip().lower()
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="Invalid email")

    token = _secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + _timedelta(days=14)).isoformat()
    inv = db.create_org_invitation(
        org_id=org_id, email=email, role=body.role,
        token=token, expires_at=expires, created_by=body.user_id,
    )
    if not inv:
        raise HTTPException(status_code=500, detail="Failed to create invitation")

    # Resolve org name + inviter display name for the email body.
    org = db.get_org(org_id) or {}
    inviter_name = None
    try:
        u = db.get_client().auth.admin.get_user_by_id(body.user_id)
        user = getattr(u, "user", None) or u
        md = (getattr(user, "user_metadata", None) or {}) if user else {}
        inviter_name = md.get("full_name") or (getattr(user, "email", None) if user else None)
    except Exception:
        pass

    accept_url = f"{_public_app_url()}/accept-invite?token={token}"
    try:
        send_org_invitation_email(
            to=email,
            org_name=org.get("name") or "Basanite",
            inviter_name=inviter_name,
            accept_url=accept_url,
        )
    except Exception as e:
        print(f"  [orgs/invite] email send failed: {type(e).__name__}: {e}")

    # Don't echo the token back to the caller — it landed in the email,
    # and the dashboard only needs the row id + email + expiry to render
    # the pending list.
    return {"invitation": {k: v for k, v in inv.items() if k != "token"}}


@app.delete("/orgs/{org_id}/invitations/{invitation_id}")
async def orgs_cancel_invitation(
    org_id: str, invitation_id: str, user_id: str,
    authorization: str | None = Header(default=None),
):
    """Cancel a pending invitation."""
    _verify_internal(authorization)
    from core import db

    role = db.is_org_member(user_id, org_id)
    if role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Owners or admins only")
    if not db.cancel_invitation(invitation_id, org_id):
        raise HTTPException(status_code=500, detail="Failed to cancel")
    return {"ok": True}


class _AcceptInviteRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)
    token: str = Field(min_length=10, max_length=200)


@app.post("/accept-invite")
async def accept_invite(body: _AcceptInviteRequest, authorization: str | None = Header(default=None)):
    """Resolve an invitation token to a membership.

    The token is the only auth on the link itself, but the FastAPI side
    additionally verifies that the signed-in user's email matches the
    invited email — stops Bob from accepting Alice's invitation by
    forwarding the link.
    """
    _verify_internal(authorization)
    from core import db

    # Pre-flight: read for expiry/cancellation/email-match checks. The
    # atomic claim below is what actually consumes the token, so a stale
    # read here can only cause us to 410 when we'd otherwise atomically
    # reject — never a false-accept.
    inv = db.get_invitation_by_token(body.token)
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if inv.get("accepted_at"):
        raise HTTPException(status_code=410, detail="Already accepted")
    if inv.get("cancelled_at"):
        raise HTTPException(status_code=410, detail="Invitation cancelled")
    expires = inv.get("expires_at")
    if expires:
        try:
            exp_dt = datetime.fromisoformat(expires.replace("Z", "+00:00"))
            if exp_dt < datetime.now(timezone.utc):
                raise HTTPException(status_code=410, detail="Invitation expired")
        except (ValueError, TypeError):
            pass

    # Email match check. Done BEFORE the atomic claim so a wrong-email
    # caller doesn't burn the token.
    invited_email = (inv.get("email") or "").lower()
    try:
        u = db.get_client().auth.admin.get_user_by_id(body.user_id)
        user = getattr(u, "user", None) or u
        signed_in_email = (getattr(user, "email", None) or "").lower()
    except Exception:
        signed_in_email = ""
    if invited_email and signed_in_email and invited_email != signed_in_email:
        raise HTTPException(
            status_code=403,
            detail=f"This invitation was sent to {invited_email}. Sign in with that account to accept.",
        )

    org_id = inv.get("org_id")
    if not org_id:
        raise HTTPException(status_code=500, detail="Invitation missing org reference")

    # ENG-59: don't let an existing higher-privilege member be silently
    # demoted by accepting an invitation sent to their own email. This
    # is the "owner invites their own email as 'member' and clicks the
    # link" footgun — without this guard the owner upserts to 'member'
    # and loses the ability to manage the org. The atomic claim below
    # would still consume the token, so we 409 *before* the claim and
    # let the operator cancel-and-reissue at a higher role if needed.
    _RANK = {"member": 1, "admin": 2, "owner": 3}
    invited_role = inv.get("role") or "member"
    current_role = db.is_org_member(body.user_id, org_id)
    if current_role and _RANK.get(current_role, 0) > _RANK.get(invited_role, 0):
        raise HTTPException(
            status_code=409,
            detail=(
                "You're already a higher-privilege member of this organisation. "
                "Have an owner cancel and re-issue the invitation if you want to change role."
            ),
        )

    # ENG-55: atomic claim. The previous mark_invitation_accepted-after
    # -add_org_member pattern raced: two concurrent /accept-invite calls
    # for the same token both passed the read-side checks and both
    # added member rows. Now exactly one caller transitions the
    # invitation to 'accepted'; the loser gets a 410.
    claimed = db.claim_invitation(body.token)
    if not claimed:
        raise HTTPException(status_code=410, detail="Already accepted")

    db.add_org_member(org_id, body.user_id, role=invited_role)
    db.set_active_org_id(body.user_id, org_id)

    # Audit consent (Article 7) — joining an org via invitation is a
    # privacy-relevant act since their data becomes visible to the org.
    try:
        db.log_consent(
            user_id=body.user_id,
            consent_type="joined_org_via_invitation",
            granted=True,
            policy_version="2026-05-02",
        )
    except Exception:
        pass

    return {"ok": True, "org_id": org_id, "org_name": (inv.get("orgs") or {}).get("name")}


class _PostSignupRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)
    email: str = Field(min_length=3, max_length=320)


@app.post("/auth/post-signup")
async def post_signup(body: _PostSignupRequest, authorization: str | None = Header(default=None)):
    """Hook fired after a hirer signs up. Auto-joins them to a matching
    org if their email domain has been configured for auto-join, else
    seeds their personal org as the active context."""
    _verify_internal(authorization)
    from core import db
    from core.orgs import extract_email_domain, is_free_email_domain

    domain = extract_email_domain(body.email)
    if domain and not is_free_email_domain(domain):
        org = db.get_org_by_auto_join_domain(domain)
        if org:
            db.add_org_member(org["id"], body.user_id, role="member")
            db.set_active_org_id(body.user_id, org["id"])
            return {"ok": True, "joined_org_id": org["id"], "auto_joined": True}

    # No auto-join match — make sure the user has a personal org and use
    # it as their active context.
    personal_org_id = db.get_or_create_personal_org(body.user_id)
    if personal_org_id:
        db.set_active_org_id(body.user_id, personal_org_id)
    return {"ok": True, "joined_org_id": personal_org_id, "auto_joined": False}


# ─── Copilot: human-led interviews assisted by the engine ──────────────────
# All endpoints are internal (_verify_internal): the Next.js proxy layer
# authenticates the interviewer and verifies session/role ownership before
# forwarding, mirroring the /roles/* and /assess/*/director patterns.

_COPILOT_MAX_SEGMENT_CHARS = 4000
_COPILOT_MAX_SEGMENTS_PER_POST = 20
_COPILOT_MAX_TRANSCRIPT_SEGMENTS = 2000


def _load_copilot_session_or_404(session_id: str) -> dict:
    from core.db import get_copilot_session
    session = get_copilot_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Copilot session not found")
    return session


def _copilot_role_for_session(session: dict) -> tuple[dict, dict]:
    """Resolve (role, assessment) for a copilot session, normalising JSONB."""
    from core.db import get_assessment, get_role
    assessment = get_assessment(session["assessment_id"])
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    role = get_role(assessment["role_id"])
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    role["dimensions"] = _coerce_json_field(role.get("dimensions", [])) or []
    if not isinstance(role["dimensions"], list):
        role["dimensions"] = []
    role["interview_plan"] = _coerce_json_field(role.get("interview_plan")) or {}
    assessment["cv_extracted"] = _coerce_json_field(assessment.get("cv_extracted")) or {}
    return role, assessment


class CreateCopilotSessionRequest(BaseModel):
    role_id: str = Field(min_length=1, max_length=64)
    interviewer_user_id: str = Field(min_length=1, max_length=64)
    candidate_name: str = Field(min_length=1, max_length=200)
    candidate_email: str = Field(min_length=3, max_length=320)
    cv_text: str | None = Field(default=None, max_length=60000)


@app.post("/copilot/sessions")
async def create_copilot_session_endpoint(
    body: CreateCopilotSessionRequest,
    authorization: str | None = Header(default=None),
):
    """Create an ad-hoc copilot assessment + session for a live role.

    The role must be live: go-live is when the hiring manager approved and
    locked the interview plan, which is the rubric every copilot artefact
    (brief, tick, wrap-up scores) is calibrated against.
    """
    _verify_internal(authorization)
    from core.db import get_role, create_assessment, create_copilot_session, update_assessment

    role = get_role(body.role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.get("status") != "live":
        raise HTTPException(
            status_code=409,
            detail="Role must be live (interview plan approved) before running a Copilot interview",
        )

    email = body.candidate_email.strip().lower()
    if "@" not in email or " " in email:
        raise HTTPException(status_code=400, detail="Invalid candidate email")

    assessment = create_assessment({
        "role_id": body.role_id,
        "candidate_name": body.candidate_name.strip(),
        "candidate_email": email,
        "source": "copilot",
        "status": "pending",
    })
    if not assessment:
        raise HTTPException(status_code=500, detail="Failed to create assessment")

    # Optional CV: extract in-line (Haiku, a few seconds) so the brief step
    # has structured data to anchor on.
    if body.cv_text and body.cv_text.strip():
        from agents.cv_extract import extract_cv
        cv_extracted = await extract_cv(body.cv_text, role.get("job_description", ""))
        if not cv_extracted.get("error"):
            update_assessment(assessment["id"], cv_extracted=cv_extracted, status="cv_uploaded")

    session = create_copilot_session(assessment["id"], body.interviewer_user_id)
    if not session:
        raise HTTPException(status_code=500, detail="Failed to create copilot session")

    return {"session_id": session["id"], "assessment_id": assessment["id"]}


@app.get("/copilot/sessions/{session_id}")
async def get_copilot_session_endpoint(
    session_id: str,
    authorization: str | None = Header(default=None),
):
    """Session + assessment + role context for the copilot pages."""
    _verify_internal(authorization)
    session = _load_copilot_session_or_404(session_id)
    role, assessment = _copilot_role_for_session(session)
    return {
        "session": session,
        "assessment": {
            "id": assessment["id"],
            "candidate_name": assessment.get("candidate_name"),
            "candidate_email": assessment.get("candidate_email"),
            "status": assessment.get("status"),
            "cv_extracted": assessment.get("cv_extracted") or {},
        },
        "role": {
            "id": role["id"],
            "title": role.get("title"),
            "company_name": role.get("company_name"),
            "dimensions": role.get("dimensions") or [],
            "interview_plan": role.get("interview_plan") or {},
            "interview_duration_minutes": role.get("interview_duration_minutes", 30),
        },
    }


@app.post("/copilot/sessions/{session_id}/brief")
async def generate_copilot_brief_endpoint(
    session_id: str,
    authorization: str | None = Header(default=None),
):
    """Generate (or return the existing) candidate-specific brief layer."""
    _verify_internal(authorization)
    from core.db import update_copilot_session
    from agents.copilot_brief import generate_copilot_brief

    session = _load_copilot_session_or_404(session_id)
    existing = _coerce_json_field(session.get("brief_pack"))
    if isinstance(existing, dict) and existing and not existing.get("error"):
        return {"brief_pack": existing, "cached": True}

    role, assessment = _copilot_role_for_session(session)
    brief = await generate_copilot_brief(role, assessment.get("cv_extracted") or {})
    if brief.get("error"):
        raise HTTPException(status_code=502, detail="Brief generation failed, please retry")

    update_copilot_session(session_id, brief_pack=brief)
    return {"brief_pack": brief, "cached": False}


class CopilotConsentRequest(BaseModel):
    confirmed_by: str = Field(min_length=1, max_length=64)
    statement: str = Field(min_length=1, max_length=1000)


@app.post("/copilot/sessions/{session_id}/consent")
async def copilot_consent_endpoint(
    session_id: str,
    body: CopilotConsentRequest,
    authorization: str | None = Header(default=None),
):
    """Record explicit two-party consent and unlock the live phase."""
    _verify_internal(authorization)
    from core.db import update_copilot_session, update_assessment

    session = _load_copilot_session_or_404(session_id)
    if session.get("status") not in ("briefing", "live"):
        raise HTTPException(status_code=409, detail="Session is past the consent phase")

    now = datetime.now(timezone.utc).isoformat()
    update_copilot_session(
        session_id,
        consent={
            "confirmed_by": body.confirmed_by,
            "confirmed_at": now,
            "statement": body.statement.strip(),
        },
        status="live",
        started_at=session.get("started_at") or now,
    )
    update_assessment(session["assessment_id"], status="in_progress", started_at=now)
    return {"ok": True, "started_at": now}


class CopilotTranscriptRequest(BaseModel):
    segments: list[dict] = Field(default_factory=list)


@app.post("/copilot/sessions/{session_id}/transcript")
async def copilot_transcript_endpoint(
    session_id: str,
    body: CopilotTranscriptRequest,
    authorization: str | None = Header(default=None),
):
    """Append committed STT segments to the session transcript."""
    _verify_internal(authorization)
    from core.db import append_copilot_transcript

    session = _load_copilot_session_or_404(session_id)
    if session.get("status") != "live":
        raise HTTPException(status_code=409, detail="Session is not live")
    if len(session.get("transcript") or []) >= _COPILOT_MAX_TRANSCRIPT_SEGMENTS:
        raise HTTPException(status_code=413, detail="Transcript segment limit reached")

    now = datetime.now(timezone.utc).isoformat()
    cleaned: list[dict] = []
    for seg in body.segments[:_COPILOT_MAX_SEGMENTS_PER_POST]:
        text = str(seg.get("text") or "")[:_COPILOT_MAX_SEGMENT_CHARS].strip()
        if not text:
            continue
        entry: dict = {"text": text, "at": now}
        elapsed = seg.get("elapsed_seconds")
        if isinstance(elapsed, (int, float)) and 0 <= elapsed < 86400:
            entry["elapsed_seconds"] = int(elapsed)
        speaker = str(seg.get("speaker") or "").strip()
        if speaker:
            entry["speaker"] = speaker[:120]
        cleaned.append(entry)

    if not cleaned:
        return {"ok": True, "appended": 0}
    transcript = append_copilot_transcript(session_id, cleaned)
    if transcript is None:
        raise HTTPException(status_code=500, detail="Failed to store transcript")
    return {"ok": True, "appended": len(cleaned), "total_segments": len(transcript)}


class CopilotTickRequest(BaseModel):
    elapsed_seconds: int = Field(ge=0, le=86400)


@app.post("/copilot/sessions/{session_id}/tick")
async def copilot_tick_endpoint(
    session_id: str,
    body: CopilotTickRequest,
    authorization: str | None = Header(default=None),
):
    """One live analysis pass; refreshes the interviewer's panel."""
    _verify_internal(authorization)
    from core.db import update_copilot_session, log_copilot_probe_event
    from agents.copilot_live import copilot_tick

    session = _load_copilot_session_or_404(session_id)
    if session.get("status") != "live":
        raise HTTPException(status_code=409, detail="Session is not live")

    role, _assessment = _copilot_role_for_session(session)
    session["brief_pack"] = _coerce_json_field(session.get("brief_pack"))
    session["live_state"] = _coerce_json_field(session.get("live_state"))
    result = await copilot_tick(role, session, body.elapsed_seconds)
    if result.get("error"):
        # Skip the tick, keep the previous panel; the client just doesn't
        # refresh this round. Mid-interview is no place for error banners.
        return {"skip": True, "reason": result["error"]}

    update_copilot_session(session_id, live_state=result)
    probe = result.get("probe")
    if isinstance(probe, dict) and probe.get("text"):
        log_copilot_probe_event(
            session_id,
            "suggested",
            dimension_key=probe.get("dimension"),
            technique=probe.get("technique"),
            probe_text=probe.get("text"),
            reason=probe.get("reason"),
        )
    return result


class CopilotProbeEventRequest(BaseModel):
    action: str = Field(pattern="^(asked|adapted|dismissed)$")
    dimension_key: str | None = Field(default=None, max_length=80)
    technique: str | None = Field(default=None, max_length=120)
    probe_text: str | None = Field(default=None, max_length=1000)
    reason: str | None = Field(default=None, max_length=500)


@app.post("/copilot/sessions/{session_id}/probe-event")
async def copilot_probe_event_endpoint(
    session_id: str,
    body: CopilotProbeEventRequest,
    authorization: str | None = Header(default=None),
):
    """Log the interviewer's response to a probe suggestion — the uptake-rate
    success metric ('suggested' events are logged by the tick itself)."""
    _verify_internal(authorization)
    from core.db import log_copilot_probe_event

    _load_copilot_session_or_404(session_id)
    log_copilot_probe_event(
        session_id,
        body.action,
        dimension_key=body.dimension_key,
        technique=body.technique,
        probe_text=body.probe_text,
        reason=body.reason,
    )
    return {"ok": True}


async def _run_copilot_wrapup(session_id: str) -> dict:
    """End the live phase and run the full Sonnet pass.

    Shared by the manual wrap-up endpoint and the bot-leave webhook so the
    interview is auto-wrapped when the call ends without the hirer clicking
    "End interview".
    """
    from core.db import update_copilot_session, list_copilot_probe_events
    from core.adherence import compute_plan_adherence
    from agents.copilot_score import generate_proposed_review

    session = _load_copilot_session_or_404(session_id)
    if session.get("status") == "review" and session.get("proposed_review"):
        return {
            "proposed_review": _coerce_json_field(session["proposed_review"]),
            "plan_adherence": _coerce_json_field(session.get("plan_adherence")),
            "cached": True,
        }
    if session.get("status") not in ("live", "wrapup"):
        raise HTTPException(status_code=409, detail="Session is not ready for wrap-up")

    now = datetime.now(timezone.utc).isoformat()
    update_copilot_session(session_id, status="wrapup", ended_at=session.get("ended_at") or now)

    # If a meeting bot is still on the call, send it home before scoring.
    bot = _coerce_json_field(session.get("bot")) or {}
    if bot.get("id") and bot.get("status") != "left":
        await _copilot_leave_bot(session_id, bot["id"])

    role, assessment = _copilot_role_for_session(session)

    # Plan adherence is deterministic (no LLM): coverage from the final
    # saturation map, probe uptake counts, near-verbatim planned-angle
    # matching. Computed before the Sonnet pass so a scoring failure never
    # loses it.
    adherence = compute_plan_adherence(
        role.get("interview_plan") or {},
        role.get("dimensions") or [],
        _coerce_json_field(session.get("live_state")),
        list_copilot_probe_events(session_id),
        _coerce_json_field(session.get("transcript")) or [],
    )
    update_copilot_session(session_id, plan_adherence=adherence)

    review = await generate_proposed_review(role, session, assessment.get("cv_extracted") or {})
    if review.get("error"):
        # Leave status at wrapup so the client can retry.
        raise HTTPException(status_code=502, detail="Score proposal failed, please retry")

    update_copilot_session(session_id, proposed_review=review, status="review")
    return {"proposed_review": review, "plan_adherence": adherence, "cached": False}


@app.post("/copilot/sessions/{session_id}/wrapup")
async def copilot_wrapup_endpoint(
    session_id: str,
    authorization: str | None = Header(default=None),
):
    """End the live phase and run the full Sonnet pass: proposed scores with
    verbatim citations + synthesis draft, pending human review."""
    _verify_internal(authorization)
    return await _run_copilot_wrapup(session_id)


class CopilotReviewScore(BaseModel):
    dimension: str = Field(min_length=1, max_length=80)
    score: int = Field(ge=1, le=5)
    override_reason: str | None = Field(default=None, max_length=1000)


class CopilotReviewRequest(BaseModel):
    signed_off_by: str = Field(min_length=1, max_length=64)
    synthesis: str = Field(min_length=1, max_length=5000)
    scores: list[CopilotReviewScore]


@app.post("/copilot/sessions/{session_id}/review")
async def copilot_review_endpoint(
    session_id: str,
    body: CopilotReviewRequest,
    authorization: str | None = Header(default=None),
):
    """Persist the human-signed scores of record and generate both reports.

    Overrides (confirmed score != proposed score) require a reason. The
    hirer report is assembled from the confirmed scores + synthesis; the
    candidate report goes through the existing generator and email flow.
    """
    _verify_internal(authorization)
    from core.db import (
        update_copilot_session,
        update_assessment,
        save_copilot_dimension_scores,
        save_report,
    )
    from core.schemas import derive_recommendation

    session = _load_copilot_session_or_404(session_id)
    if session.get("status") == "submitted":
        raise HTTPException(status_code=409, detail="Session already submitted")
    if session.get("status") != "review":
        raise HTTPException(status_code=409, detail="Session is not in review")

    proposed = _coerce_json_field(session.get("proposed_review")) or {}
    proposed_by_dim = {
        r.get("dimension"): r
        for r in (proposed.get("proposed_scores") or [])
        if isinstance(r, dict)
    }

    role, assessment = _copilot_role_for_session(session)
    selected = set(role.get("dimensions") or [])

    rows: list[dict] = []
    for s in body.scores:
        if s.dimension not in selected:
            raise HTTPException(status_code=400, detail=f"Unknown dimension: {s.dimension}")
        prop = proposed_by_dim.get(s.dimension) or {}
        proposed_score = prop.get("score")
        if proposed_score is not None and s.score != proposed_score and not (s.override_reason or "").strip():
            raise HTTPException(
                status_code=400,
                detail=f"Override of {s.dimension} requires a reason",
            )
        rows.append({
            "dimension": s.dimension,
            "score": s.score,
            "proposed_score": proposed_score,
            "quotation_basis": prop.get("quotation_basis"),
            "notes": prop.get("notes"),
            "override_reason": (s.override_reason or "").strip() or None,
        })
    missing = selected - {r["dimension"] for r in rows}
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing scores for: {', '.join(sorted(missing))}")

    if not save_copilot_dimension_scores(assessment["id"], rows, body.signed_off_by):
        raise HTTPException(status_code=500, detail="Failed to save scores")

    synthesis = body.synthesis.strip()
    composite = round(sum(r["score"] for r in rows) / len(rows), 2) if rows else None
    plan_adherence = _coerce_json_field(session.get("plan_adherence"))
    hirer_content = {
        "source": "copilot",
        "plan_adherence": plan_adherence,
        "headline_summary": synthesis.split(". ")[0][:300] if synthesis else "",
        "recommendation": derive_recommendation(composite),
        "recommendation_rationale": "Scores confirmed by the interviewer at sign-off.",
        "synthesis": synthesis,
        "scoring_summary": [
            {
                "dimension": r["dimension"],
                "score": r["score"],
                "quotation_basis": r.get("quotation_basis") or "",
                "notes": r.get("notes") or "",
                "verified": bool((proposed_by_dim.get(r["dimension"]) or {}).get("verified")),
            }
            for r in rows
        ],
        "composite_score": composite,
    }
    save_report(assessment["id"], "hirer", hirer_content)

    now = datetime.now(timezone.utc).isoformat()
    update_assessment(assessment["id"], status="completed", completed_at=now)
    update_copilot_session(session_id, status="submitted")

    # Candidate report + email in the background — the interviewer shouldn't
    # wait on Sonnet + Resend to see the confirmation screen.
    asyncio.create_task(
        _copilot_candidate_report(assessment["id"], role, assessment.get("cv_extracted") or {},
                                  _coerce_json_field(session.get("transcript")) or [])
    )
    return {"ok": True, "composite_score": composite}


async def _copilot_candidate_report(
    assessment_id: str, role: dict, cv_extracted: dict, transcript_segments: list[dict]
):
    """Generate + store the candidate report and send the report email.

    The copilot transcript has no speaker attribution, so all segments are
    passed as candidate turns; the report prompt already treats transcript
    content as untrusted data, and candidate-facing feedback tolerates the
    interviewer's questions being in-frame.
    """
    from core.db import save_report, get_assessment
    from core.email import send_report_email
    from agents.report import generate_candidate_report

    messages = [
        {"role": "user", "content": str(seg.get("text") or "")}
        for seg in transcript_segments
        if isinstance(seg, dict) and str(seg.get("text") or "").strip()
    ]
    if not messages:
        print(f"  [copilot] no transcript for candidate report {assessment_id}")
        return
    try:
        report = await generate_candidate_report(messages, role, cv_extracted)
        save_report(assessment_id, "candidate", report)
        assessment = get_assessment(assessment_id)
        to = (assessment or {}).get("candidate_email") or ""
        name = (assessment or {}).get("candidate_name") or ""
        if to and not report.get("error"):
            sent = send_report_email(
                to=to,
                candidate_name=name,
                role_title=role.get("title", "the role"),
                report=report,
            )
            print(f"  [copilot] candidate report email {'sent' if sent else 'skipped'} for {assessment_id}")
    except Exception as e:
        print(f"  [copilot] candidate report failed: {type(e).__name__}: {e}")


# ─── Copilot bot-join (Google Meet only, via Recall.ai) ────────────────────
# The disclosed-participant design from the product doc: a bot joins the
# Meet call, Recall streams diarized transcript utterances to our webhook,
# and the live panel needs no microphone at all.

_RECALL_REGIONS = ("us-east-1", "us-west-2", "eu-central-1", "ap-northeast-1")
# Meet codes are xxx-xxxx-xxx; tolerate the occasional variant length but
# never another host — bot-join is Google Meet only in this iteration.
_MEET_URL_RE = __import__("re").compile(
    r"^https://meet\.google\.com/[a-z0-9]{3,4}-[a-z0-9]{3,4}-[a-z0-9]{3,4}(?:\?.*)?$"
)


def _recall_base() -> str:
    region = os.getenv("RECALL_REGION", "us-east-1")
    if region not in _RECALL_REGIONS:
        region = "us-east-1"
    return f"https://{region}.recall.ai/api/v1"


def _recall_headers() -> dict:
    key = os.getenv("RECALL_API_KEY", "")
    if not key:
        raise HTTPException(status_code=500, detail="RECALL_API_KEY not configured")
    return {"Authorization": key, "Content-Type": "application/json"}


class CopilotBotRequest(BaseModel):
    meeting_url: str = Field(min_length=1, max_length=500)


@app.post("/copilot/sessions/{session_id}/bot")
async def copilot_create_bot(
    session_id: str,
    body: CopilotBotRequest,
    authorization: str | None = Header(default=None),
):
    """Send a disclosed Basanite bot into the interviewer's Google Meet call.

    Recall.ai handles the Meet integration and streams diarized transcript
    utterances to /copilot/bot-webhook — better speaker attribution than the
    browser-mic path can offer.
    """
    _verify_internal(authorization)
    import httpx
    from core.db import update_copilot_session

    session = _load_copilot_session_or_404(session_id)
    if session.get("status") != "live":
        raise HTTPException(status_code=409, detail="Record consent before inviting the bot")
    existing_bot = _coerce_json_field(session.get("bot")) or {}
    if existing_bot.get("id"):
        return {"bot_id": existing_bot["id"], "cached": True}

    meeting_url = body.meeting_url.strip()
    if not _MEET_URL_RE.match(meeting_url):
        raise HTTPException(
            status_code=400,
            detail="Bot-join currently supports Google Meet links only (https://meet.google.com/xxx-xxxx-xxx)",
        )
    # Strip Google tracking/redirect query params (e.g. ?pli=1) before sending
    # to Recall — the bot only needs the bare meeting code.
    clean_url = meeting_url.split("?")[0]

    public_url = (os.getenv("PIPELINE_PUBLIC_URL", "") or "").rstrip("/")
    if not public_url.startswith("https://"):
        raise HTTPException(status_code=500, detail="PIPELINE_PUBLIC_URL not configured")

    # meeting_captions is Recall's free, native-captions provider and is the
    # most reliable way to get real-time transcript events on Google Meet.
    # recallai_streaming can be opted back in via RECALL_TRANSCRIPTION_PROVIDER.
    provider = (os.getenv("RECALL_TRANSCRIPTION_PROVIDER", "meeting_captions") or "meeting_captions").lower()
    if provider == "recallai_streaming":
        transcript_config = {
            "provider": {
                "recallai_streaming": {
                    "mode": "prioritize_low_latency",
                    "language_code": "en",
                }
            },
            "diarization": {"use_separate_streams_when_available": True},
        }
    else:
        transcript_config = {
            "provider": {"meeting_captions": {}},
        }

    payload = {
        "meeting_url": clean_url,
        "bot_name": "Basanite Copilot (transcribing)",
        "recording_config": {
            "transcript": transcript_config,
            "realtime_endpoints": [
                {
                    "type": "webhook",
                    "url": f"{public_url}/copilot/bot-webhook",
                    "events": [
                        "transcript.data",
                        "participant_events.join",
                        "participant_events.leave",
                    ],
                }
            ],
        },
    }
    print(f"  [copilot] creating bot with provider={provider}, url={clean_url}")
    async with httpx.AsyncClient(timeout=30.0) as http:
        resp = await http.post(f"{_recall_base()}/bot/", headers=_recall_headers(), json=payload)
    if resp.status_code not in (200, 201):
        # 507 = Recall capacity; surface a retryable message without echoing
        # the vendor body into logs or the client.
        print(f"  [copilot] recall create bot failed: HTTP {resp.status_code}")
        detail = (
            "Meeting bots are at capacity, retry in ~30 seconds"
            if resp.status_code == 507
            else "Failed to send the bot to the call"
        )
        raise HTTPException(status_code=502, detail=detail)

    bot_id = (resp.json() or {}).get("id")
    if not bot_id:
        raise HTTPException(status_code=502, detail="Failed to send the bot to the call")

    print(f"  [copilot] recall bot created: {bot_id}")
    update_copilot_session(
        session_id,
        bot={"id": bot_id, "meeting_url": clean_url, "status": "joining"},
    )
    return {"bot_id": bot_id, "cached": False}


@app.post("/copilot/sessions/{session_id}/bot/stop")
async def copilot_stop_bot(
    session_id: str,
    authorization: str | None = Header(default=None),
):
    """Ask the bot to leave the call. Best-effort; wrap-up also calls this."""
    _verify_internal(authorization)
    session = _load_copilot_session_or_404(session_id)
    bot = _coerce_json_field(session.get("bot")) or {}
    if not bot.get("id"):
        return {"ok": True, "no_bot": True}
    await _copilot_leave_bot(session_id, bot["id"])
    return {"ok": True}


async def _copilot_leave_bot(session_id: str, bot_id: str):
    """POST leave_call to Recall and stamp the bot status. Never raises —
    a bot that lingers a few extra seconds is not worth failing wrap-up over."""
    import httpx
    from core.db import update_copilot_session

    import re as _re
    if not _re.fullmatch(r"[A-Za-z0-9_-]{1,64}", str(bot_id)):
        return
    try:
        async with httpx.AsyncClient(timeout=15.0) as http:
            await http.post(
                f"{_recall_base()}/bot/{bot_id}/leave_call/",
                headers=_recall_headers(),
            )
    except Exception as e:
        print(f"  [copilot] recall leave_call failed: {type(e).__name__}")
    try:
        session = _load_copilot_session_or_404(session_id)
        bot = _coerce_json_field(session.get("bot")) or {}
        bot["status"] = "left"
        update_copilot_session(session_id, bot=bot)
    except Exception:
        pass


def _verify_recall_signature(headers, body_bytes: bytes) -> bool:
    """Verify a Recall real-time or dashboard webhook.

    New Recall accounts (created on/after 2025-12-15) use a workspace
    verification secret and `webhook-*` headers. Legacy accounts and Svix
    dashboard endpoints use `svix-*` headers. We accept either.
    """
    import base64

    secret = (
        os.getenv("RECALL_WORKSPACE_VERIFICATION_SECRET", "")
        or os.getenv("RECALL_WEBHOOK_SECRET", "")
        or os.getenv("RECALL_SVIX_WEBHOOK_SECRET", "")
    )
    if not secret or not secret.startswith("whsec_"):
        return False

    msg_id = headers.get("webhook-id") or headers.get("svix-id") or ""
    msg_timestamp = headers.get("webhook-timestamp") or headers.get("svix-timestamp") or ""
    msg_signature = headers.get("webhook-signature") or headers.get("svix-signature") or ""
    if not (msg_id and msg_timestamp and msg_signature):
        return False

    try:
        ts = int(msg_timestamp)
        now = int(datetime.now(timezone.utc).timestamp())
        if abs(now - ts) > 300:
            return False
        key = base64.b64decode(secret.removeprefix("whsec_"))
        signed = f"{msg_id}.{msg_timestamp}.".encode("utf-8") + body_bytes
        expected = base64.b64encode(hmac.new(key, signed, hashlib.sha256).digest()).decode()
    except Exception:
        return False

    for candidate in msg_signature.split(" "):
        _, _, sig = candidate.partition(",")
        if sig and hmac.compare_digest(sig, expected):
            return True
    return False


def _is_bot_participant(session: dict, participant: dict) -> bool:
    """Match a Recall participant to the Basanite bot for this session."""
    bot = _coerce_json_field(session.get("bot")) or {}
    name = str(participant.get("name") or "").strip()
    if not name:
        return False
    # Match by stored participant id if we've seen a join event.
    if "participant_id" in bot and participant.get("id") is not None:
        return str(participant["id"]) == str(bot["participant_id"])
    # Fallback to the bot name we configured.
    return name.startswith("Basanite Copilot") or name == bot.get("name")


async def _auto_wrapup_bot_session(session_id: str):
    """Background wrap-up triggered when the bot leaves the call."""
    try:
        from core.db import get_copilot_session

        session = get_copilot_session(session_id)
        if not session or session.get("status") != "live":
            print(f"  [copilot] auto wrap-up skipped for {session_id} (status={session.get('status')})")
            return

        await _run_copilot_wrapup(session_id)
        print(f"  [copilot] auto wrap-up completed for {session_id}")
    except Exception as e:
        print(f"  [copilot] auto wrap-up failed for {session_id}: {type(e).__name__}: {e}")


@app.post("/copilot/bot-webhook")
async def copilot_bot_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
):
    """Recall real-time transcript / participant event ingestion.

    Handles transcript.data, participant join/leave, and triggers automatic
    wrap-up when the bot leaves the call so interviews don't stay "live"
    when the hirer ends the Google Meet without clicking "End interview".
    """
    _rate_limit(request, bucket="copilot-bot-webhook", max_requests=1200, window_seconds=60)
    body_bytes = await request.body()
    if not _verify_recall_signature(request.headers, body_bytes):
        raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        payload = json.loads(body_bytes)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event = payload.get("event", "")
    data = payload.get("data") or {}
    bot_id = (data.get("bot") or {}).get("id") or ""
    inner = data.get("data") or {}

    if not bot_id:
        return {"ok": True, "empty": True}

    from core.db import get_copilot_session_by_bot_id, append_copilot_transcript, update_copilot_session

    if event == "transcript.failed":
        print(f"  [copilot] recall transcript.failed: {payload.get('data')}")
        return {"ok": True}

    if event == "transcript.data":
        words = inner.get("words") or []
        text = " ".join(
            str(w.get("text") or "").strip() for w in words if isinstance(w, dict)
        ).strip()
        if not text:
            return {"ok": True, "empty": True}

        session = get_copilot_session_by_bot_id(bot_id)
        if not session or session.get("status") != "live":
            print(f"  [copilot] recall bot webhook no live session for bot {bot_id}")
            return {"ok": True, "no_session": True}
        if len(session.get("transcript") or []) >= _COPILOT_MAX_TRANSCRIPT_SEGMENTS:
            return {"ok": True, "truncated": True}

        participant = inner.get("participant") or {}
        speaker = str(participant.get("name") or "").strip()[:120]
        segment: dict = {
            "text": text[:_COPILOT_MAX_SEGMENT_CHARS],
            "at": datetime.now(timezone.utc).isoformat(),
        }
        if speaker:
            segment["speaker"] = speaker

        first = words[0] if words and isinstance(words[0], dict) else {}
        rel = ((first.get("start_timestamp") or {}).get("relative"))
        if not isinstance(rel, (int, float)) or not (0 <= rel < 86400):
            if isinstance(inner.get("words"), list) and inner["words"]:
                rel = ((inner["words"][0].get("start_timestamp") or {}).get("relative"))
        if not isinstance(rel, (int, float)) or not (0 <= rel < 86400):
            started_at = session.get("started_at")
            if started_at:
                try:
                    rel = (datetime.now(timezone.utc) - datetime.fromisoformat(str(started_at).replace("Z", "+00:00"))).total_seconds()
                except Exception:
                    rel = None
        if isinstance(rel, (int, float)) and 0 <= rel < 86400:
            segment["elapsed_seconds"] = int(rel)

        append_copilot_transcript(session["id"], [segment])
        print(f"  [copilot] appended transcript segment for bot {bot_id}: {text[:80]}")
        return {"ok": True}

    if event == "participant_events.join":
        session = get_copilot_session_by_bot_id(bot_id)
        if not session or session.get("status") != "live":
            return {"ok": True, "no_session": True}
        participant = inner.get("participant") or {}
        if _is_bot_participant(session, participant):
            bot = _coerce_json_field(session.get("bot")) or {}
            bot["status"] = "joined"
            if participant.get("id") is not None:
                bot["participant_id"] = participant["id"]
            update_copilot_session(session["id"], bot=bot)
            print(f"  [copilot] bot joined call: {bot_id}")
        return {"ok": True}

    if event == "participant_events.leave":
        session = get_copilot_session_by_bot_id(bot_id)
        if not session or session.get("status") != "live":
            return {"ok": True, "no_session": True}
        participant = inner.get("participant") or {}
        if _is_bot_participant(session, participant):
            bot = _coerce_json_field(session.get("bot")) or {}
            bot["status"] = "left"
            if participant.get("id") is not None:
                bot["participant_id"] = participant["id"]
            update_copilot_session(session["id"], bot=bot)
            print(f"  [copilot] bot left call, auto wrap-up scheduled: {bot_id}")
            background_tasks.add_task(_auto_wrapup_bot_session, session["id"])
        return {"ok": True}

    print(f"  [copilot] recall bot webhook ignored event: {event}")
    return {"ok": True, "ignored": True}


@app.get("/copilot/scribe-token")
async def copilot_scribe_token(authorization: str | None = Header(default=None)):
    """Mint an ElevenLabs single-use realtime-scribe token for the browser.

    The API key never reaches the client; the token expires in 15 minutes
    and is consumed on use — the live page re-fetches when reconnecting.
    """
    _verify_internal(authorization)
    import httpx

    async with httpx.AsyncClient(timeout=15.0) as http:
        resp = await http.post(
            f"{_EL_API}/single-use-token/realtime_scribe",
            headers=_el_headers(),
        )
    if resp.status_code != 200:
        print(f"  [copilot] scribe token mint failed: HTTP {resp.status_code}")
        raise HTTPException(status_code=502, detail="Failed to mint transcription token")
    token = (resp.json() or {}).get("token")
    if not token:
        raise HTTPException(status_code=502, detail="Failed to mint transcription token")
    return {"token": token}

