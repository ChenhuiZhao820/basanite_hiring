"""
Basanite FastAPI server — AI-powered technical interview and assessment platform.

Run with:
    source .venv/bin/activate
    uvicorn api:app --reload --port 8000
"""
import asyncio
import json
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

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


def _verify_internal(authorization: str | None):
    """Raise 401 if the request doesn't carry the internal pipeline secret."""
    if not _PIPELINE_SECRET:
        raise HTTPException(status_code=500, detail="PIPELINE_API_SECRET not configured")
    expected = f"Bearer {_PIPELINE_SECRET}"
    if not authorization or authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ─── Health ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "basanite"}


# ─── Roles ─────────────────────────────────────────────────────────────────

class CreateRoleRequest(BaseModel):
    user_id: str
    title: str
    company_name: str | None = None
    job_description: str


class UpdateRoleRequest(BaseModel):
    title: str | None = None
    dimensions: list[str] | None = None
    technical_depth: str | None = None
    eligibility_constraints: dict | None = None
    status: str | None = None


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
    if "dimensions" in fields:
        fields["dimensions"] = json.dumps(fields["dimensions"])
    if "eligibility_constraints" in fields:
        fields["eligibility_constraints"] = json.dumps(fields["eligibility_constraints"])

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
    """Public endpoint — returns role info for the assessment landing page."""
    from core.db import get_role_by_token
    role = get_role_by_token(token)
    if not role:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if role["status"] != "live":
        raise HTTPException(status_code=410, detail="This assessment is no longer accepting candidates")
    return {
        "role_title": role["title"],
        "company_name": role.get("company_name"),
        "dimensions_count": len(role.get("dimensions", [])),
    }


class StartAssessmentRequest(BaseModel):
    candidate_user_id: str
    candidate_name: str
    candidate_email: str
    cv_text: str


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


@app.post("/assess/{token}/message")
async def interview_message(
    token: str,
    body: dict,
):
    """
    Send a candidate message and stream the AI interviewer's response.
    Returns SSE stream.
    """
    from core.db import get_role_by_token, get_assessment
    from interview import process_message, assemble_interview_prompt

    assessment_id = body.get("assessment_id")
    candidate_message = body.get("message", "")

    if not assessment_id or not candidate_message:
        raise HTTPException(status_code=400, detail="Missing assessment_id or message")

    role = get_role_by_token(token)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    assessment = get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    cv_extracted = assessment.get("cv_extracted", {})
    if isinstance(cv_extracted, str):
        cv_extracted = json.loads(cv_extracted)

    system_prompt = assemble_interview_prompt(role, cv_extracted)

    # Update status if first message
    if assessment.get("status") == "cv_uploaded":
        from core.db import update_assessment
        update_assessment(assessment_id, status="in_progress", started_at=datetime.now(timezone.utc).isoformat())

    recording_path = body.get("recording_path")

    async def event_stream():
        async for chunk in process_message(
            assessment_id, candidate_message, role, system_prompt, recording_path=recording_path
        ):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/assess/{token}/transcribe")
async def transcribe_answer(
    token: str,
    assessment_id: str = Form(...),
    message_index: int = Form(...),
    file: UploadFile = File(...),
):
    """
    Upload a candidate's recorded answer (webm audio+video) to Supabase Storage
    and return a Whisper transcript. The transcript is NOT written to the session
    here — the caller then POSTs it to /assess/{token}/message with `recording_path`
    so the existing message flow appends it in order.
    """
    from core.db import get_role_by_token, get_assessment, get_client

    role = get_role_by_token(token)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    assessment = get_assessment(assessment_id)
    if not assessment or assessment["role_id"] != role["id"]:
        raise HTTPException(status_code=404, detail="Assessment not found")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty upload")

    # Store the raw recording in Supabase Storage for later human review.
    client = get_client()
    if not client:
        raise HTTPException(status_code=500, detail="Storage not configured")

    recording_path = f"{assessment_id}/{message_index}.webm"
    try:
        client.storage.from_("interview-recordings").upload(
            path=recording_path,
            file=audio_bytes,
            file_options={"content-type": "video/webm", "upsert": "true"},
        )
    except Exception as e:
        print(f"  [transcribe] storage upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to store recording")

    # Transcribe with Whisper. The SDK wants a file-like object with a .name
    # so it can infer the format; an in-memory BytesIO with a filename works.
    import io
    from openai import OpenAI

    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
    buf = io.BytesIO(audio_bytes)
    buf.name = "answer.webm"
    try:
        result = openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=buf,
        )
        transcript = (result.text or "").strip()
    except Exception as e:
        print(f"  [transcribe] whisper failed: {e}")
        raise HTTPException(status_code=500, detail="Transcription failed")

    return {
        "transcript": transcript,
        "recording_path": recording_path,
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


@app.get("/assess/{token}/report/{report_type}")
async def get_assessment_report(
    token: str,
    report_type: str,
):
    """Get a generated report (hirer or candidate)."""
    from core.db import get_report

    if report_type not in ("hirer", "candidate"):
        raise HTTPException(status_code=400, detail="Invalid report type")

    # We need to find the assessment_id — for now, accept it as query param
    # In production, this would be derived from the authenticated user
    from fastapi import Query
    # Simplified: report lookup by assessment_id passed in body
    # TODO: proper auth-based lookup
    return {"error": "Use the Next.js API routes with proper auth for report access"}
