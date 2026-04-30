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
from fastapi import FastAPI, HTTPException, Header, UploadFile, File, Form
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
    allow_methods=["POST", "GET", "PATCH"],
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
    from core.db import update_role as db_update_role

    fields = {k: v for k, v in body.model_dump().items() if v is not None}
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
    from core.db import get_role_by_token, create_assessment, update_assessment, create_interview_session
    from agents.cv_extract import extract_cv
    from interview import assemble_interview_prompt

    role = get_role_by_token(token)
    if not role or role["status"] != "live":
        raise HTTPException(status_code=404, detail="Assessment not found or not active")

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

    # Assemble the role+candidate-specific interview prompt
    full_prompt = assemble_interview_prompt(role, cv_extracted)

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

    prompt = assemble_interview_prompt(role, cv)
    candidate_name = (cv.get("name") or "there").split()[0]
    first_message = (
        f"Hi {candidate_name}, I'm Baz, I'll be your interviewer today. "
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
    return {
        "signed_url": signed_url,
        "prompt": prompt,
        "first_message": first_message,
        "max_duration_seconds": max_duration_seconds,
    }


@app.post("/assess/{token}/director")
async def director_tick(token: str, body: dict):
    """
    One pass of the Director supervisor. Returns a short tactical directive the
    live client can forward to the ElevenLabs agent via sendContextualUpdate.
    """
    from interview import director_directive

    assessment_id = body.get("assessment_id")
    if not assessment_id:
        raise HTTPException(status_code=400, detail="Missing assessment_id")

    role, _assessment, cv = _load_assessment_for_token(token, assessment_id)
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

    elapsed_seconds = int(body.get("elapsed_seconds") or 0)

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
