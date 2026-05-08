"""
Basanite FastAPI server, AI powered technical interview and assessment platform.

Run with:
    source .venv/bin/activate
    uvicorn api:app --reload --port 8000
"""
import asyncio
import hmac
import json
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header, Request, UploadFile, File, Form
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


# ─── Upload limits ─────────────────────────────────────────────────────────

_MAX_CV_BYTES = 10 * 1024 * 1024          # 10 MB — comfortably larger than any CV
_MAX_RECORDING_BYTES = 200 * 1024 * 1024  # 200 MB — ~45 min low-bitrate webm


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


@app.post("/roles/{role_id}/go-live")
async def go_live(
    role_id: str,
    authorization: str | None = Header(default=None),
):
    _verify_internal(authorization)
    from core.db import get_role as db_get_role, update_role as db_update_role

    role = db_get_role(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if not role.get("dimensions"):
        raise HTTPException(status_code=400, detail="No dimensions configured")

    db_update_role(role_id, status="live")
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


# ─── Assessment (candidate-facing) ─────────────────────────────────────────

@app.get("/assess/{token}")
async def get_assessment_info(token: str):
    """Public endpoint, returns role info for the assessment landing page."""
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


@app.post("/assess/{token}/cv-upload")
async def cv_upload(
    token: str,
    file: UploadFile = File(...),
):
    """
    Extract text from an uploaded CV (PDF for now). The extracted text is
    returned to the client, which then POSTs it to /assess/{token}/start
    alongside the other assessment bootstrap fields.
    """
    from core.db import get_role_by_token
    role = get_role_by_token(token)
    if not role or role["status"] != "live":
        raise HTTPException(status_code=404, detail="Assessment not found or not active")

    data = await _read_bounded(file, _MAX_CV_BYTES)
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    is_pdf = (
        filename.endswith(".pdf")
        and content_type in ("application/pdf", "application/x-pdf", "")
        and data[:4] == b"%PDF"
    )
    if not is_pdf:
        raise HTTPException(
            status_code=415,
            detail="Upload a PDF, or paste the CV text directly.",
        )

    try:
        import io
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data))
        pages = []
        for page in reader.pages:
            try:
                pages.append(page.extract_text() or "")
            except Exception:
                continue
        text = "\n\n".join(p.strip() for p in pages if p.strip())
    except Exception as e:
        print(f"  [cv-upload] pdf parse failed: {e}")
        raise HTTPException(status_code=422, detail="We couldn't read that PDF. Paste the text instead.")

    if not text or len(text) < 80:
        raise HTTPException(
            status_code=422,
            detail="That PDF didn't contain enough readable text (it may be a scan). Paste the CV text instead.",
        )
    return {"cv_text": text, "char_count": len(text)}


@app.post("/assess/{token}/start")
async def start_assessment(
    token: str,
    body: StartAssessmentRequest,
):
    """Create an assessment and extract CV. Returns assessment_id."""
    from core.db import (
        get_role_by_token,
        create_assessment,
        update_assessment,
        create_interview_session,
        get_active_assessment_for_candidate,
    )
    from agents.cv_extract import extract_cv
    from interview import assemble_interview_prompt

    role = get_role_by_token(token)
    if not role or role["status"] != "live":
        raise HTTPException(status_code=404, detail="Assessment not found or not active")

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

    # Create assessment
    assessment = create_assessment({
        "role_id": role["id"],
        "candidate_user_id": body.candidate_user_id,
        "candidate_name": body.candidate_name,
        "candidate_email": body.candidate_email,
        "status": "cv_uploaded",
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

    # Create interview session
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
async def voice_session(token: str, body: dict):
    """
    Prepare a fresh ElevenLabs conversation: mint a signed WebSocket URL and
    return the per-session overrides (system prompt + first message) the
    browser SDK will send when it opens the socket.
    """
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

    # NOTE: the full system prompt is returned to the candidate's browser
    # because the @elevenlabs/react SDK injects per-session overrides from
    # the client. This exposes `custom_instructions` and the JD to anyone
    # inspecting the network tab. Closing this cleanly requires either
    # ElevenLabs' agent-level config API (slow, racy under concurrent
    # sessions) or a per-session agent — see H3 in the security audit.
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
        "prompt": prompt,
        "first_message": first_message,
        "max_duration_seconds": max_duration_seconds,
    }
    if voice_id:
        payload["voice_id"] = voice_id
    return payload


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
# 5MB cap on the audio payload. ElevenLabs IVC accepts much more, but we
# don't want a malicious upload eating worker memory before we forward.
_MAX_VOICE_CLONE_BYTES = 5 * 1024 * 1024
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
    ok = db.soft_delete_org_custom_voice(custom_voice_id, org_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to delete voice")
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
    assessment_id: str = Form(...),
    file: UploadFile = File(...),
):
    """Store the full-session webm recording in Supabase Storage."""
    from core.db import get_client

    role, _assessment, _cv = _load_assessment_for_token(token, assessment_id)

    data = await _read_bounded(file, _MAX_RECORDING_BYTES)
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload")

    client = get_client()
    if not client:
        raise HTTPException(status_code=500, detail="Storage not configured")

    recording_path = f"{assessment_id}/session.webm"
    try:
        client.storage.from_("interview-recordings").upload(
            path=recording_path,
            file=data,
            file_options={"content-type": "video/webm", "upsert": "true"},
        )
    except Exception as e:
        print(f"  [upload-recording] storage upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to store recording")

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

    if messages:
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

    # Generate reports in background
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
):
    """Candidate-facing: download a PDF of their report. Token + assessment_id must match.

    Candidates may only download their own `candidate` report. The hirer
    report is confidential (contains grading, quotation_basis, internal
    notes) and must be fetched via the authenticated hirer-only route
    `/reports/{assessment_id}/{report_type}/pdf`.
    """
    from fastapi.responses import Response
    from core.db import get_role_by_token, get_assessment

    if report_type != "candidate":
        raise HTTPException(status_code=404, detail="Report not found")

    role = get_role_by_token(token)
    if not role:
        raise HTTPException(status_code=404, detail="Assessment not found")
    assessment = get_assessment(assessment_id)
    if not assessment or assessment["role_id"] != role["id"]:
        raise HTTPException(status_code=404, detail="Assessment not found for this link")

    pdf_bytes, filename = _build_report_pdf(assessment_id, report_type)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/reports/{assessment_id}/{report_type}/pdf")
async def download_internal_report_pdf(
    assessment_id: str,
    report_type: str,
    authorization: str | None = Header(default=None),
):
    """Hirer-facing (via Next.js auth proxy): download a PDF by assessment_id."""
    _verify_internal(authorization)
    from fastapi.responses import Response
    pdf_bytes, filename = _build_report_pdf(assessment_id, report_type)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
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

    if db.webhook_event_seen(event_id):
        return {"status": "duplicate", "event_id": event_id}

    hook_type = payload.get("hook", {}).get("event") or payload.get("event") or payload.get("type")
    linked_account_id = (payload.get("linked_account") or {}).get("id")

    # Log receipt; we'll update to processed/failed at the end.
    db.log_webhook_event(
        event_id=event_id,
        hook_type=hook_type,
        linked_account_id=linked_account_id,
        status="received",
        payload_summary={
            "hook": hook_type,
            "model_type": payload.get("data", {}).get("model_type") if isinstance(payload.get("data"), dict) else None,
        },
    )

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
async def get_invite_info(invite_token: str):
    """
    Resolve a unique invite token to the underlying assessment. The candidate
    flow uses this on `/assess/invite/{token}` to skip the CV upload step
    when the assessment was pre-populated from an ATS sync.
    """
    from core.db import get_assessment_by_invite_token, get_role

    assessment = get_assessment_by_invite_token(invite_token)
    if not assessment:
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
        "candidate_name": assessment.get("candidate_name"),
        "candidate_email": assessment.get("candidate_email"),
        "cv_prefilled": bool(cv),
        "experience_path": assessment.get("experience_path"),
    }


# ─── Public report PDF (PR7) ───────────────────────────────────────────────


@app.get("/reports/public/{assessment_id}")
async def download_public_report_pdf(assessment_id: str, token: str):
    """
    Serve the hirer report PDF when called with a valid signed `token`. The
    URL is what we drop into the ATS note so the customer's reviewers can
    open the report without a Basanite login.

    The signature is HMAC-SHA256 over `assessment_id:expires_at_unix`.
    Tokens expire 90 days after the push (configurable in core/ats.sign).
    """
    from fastapi.responses import Response
    from core import ats

    if not ats.verify_public_report_url(assessment_id, token):
        raise HTTPException(status_code=403, detail="Invalid or expired link")

    pdf_bytes, filename = _build_report_pdf(assessment_id, "hirer")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
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
    authorization: str | None = Header(default=None),
):
    """Send the data subject a one-time verification link by email."""
    _verify_internal(authorization)
    from core.email import send_dsar_verification_email

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
    from core.db import get_client
    from datetime import datetime as _dt

    client = get_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database unavailable")

    try:
        result = (
            client.table("dsar_requests")
            .select("*")
            .eq("verification_token", body.token)
            .single()
            .execute()
        )
        row = result.data
    except Exception:
        raise HTTPException(status_code=404, detail="Token not found")

    if not row:
        raise HTTPException(status_code=404, detail="Token not found")
    if row.get("status") in ("completed", "rejected"):
        raise HTTPException(status_code=404, detail="Already actioned")

    expires = row.get("verification_expires_at")
    if expires:
        try:
            exp_dt = _dt.fromisoformat(expires.replace("Z", "+00:00"))
            if exp_dt < datetime.now(timezone.utc):
                client.table("dsar_requests").update({"status": "expired"}).eq(
                    "id", row["id"]
                ).execute()
                raise HTTPException(status_code=410, detail="Token expired")
        except (ValueError, TypeError):
            pass

    request_type = row["request_type"]
    email = row["email"]

    # Mark verified before doing the work — even if the work fails, we
    # don't want a stale token re-usable.
    client.table("dsar_requests").update({"status": "verified"}).eq(
        "id", row["id"]
    ).execute()

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

    # Email match check.
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

    db.add_org_member(org_id, body.user_id, role=inv.get("role") or "member")
    db.mark_invitation_accepted(inv["id"])
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
