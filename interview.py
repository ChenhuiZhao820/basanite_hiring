"""
Basanite Interview Orchestrator — manages the state machine for AI-conducted interviews.

This is the core product logic. It:
1. Loads and assembles the interview agent prompt for a role
2. Processes candidate messages and streams AI interviewer responses
3. Manages interview phase transitions
4. Triggers report generation on interview completion
"""
import os
import json
from datetime import datetime, timezone
from typing import AsyncIterator

from core.llm import get_llm_service, MODEL_INTERVIEW
from core.db import (
    get_interview_session,
    update_interview_session,
    update_assessment,
    save_dimension_scores,
    save_report,
)
from agents.report import generate_hirer_report, generate_candidate_report

# Load the base interview prompt once at module level
_BASE_PROMPT_PATH = os.path.join(
    os.path.dirname(__file__),
    "resources", "basanite", "claudeMVP", "Basanite Interview Prompt.md",
)

_BASE_PROMPT: str | None = None


def _load_base_prompt() -> str:
    global _BASE_PROMPT
    if _BASE_PROMPT is None:
        with open(_BASE_PROMPT_PATH, "r") as f:
            _BASE_PROMPT = f.read()
    return _BASE_PROMPT


def assemble_interview_prompt(
    role_config: dict,
    cv_extracted: dict,
) -> str:
    """
    Assemble the full interview agent system prompt by injecting
    role-specific and candidate-specific context into the base prompt.
    """
    base = _load_base_prompt()

    dimensions = role_config.get("dimensions", [])
    technical_depth = role_config.get("technical_depth", "application")
    jd = role_config.get("job_description", "")

    # Build dimension context
    from agents.dimensions import DIMENSIONS
    dim_descriptions = "\n".join(
        f"- {DIMENSIONS[d]['name']}: {DIMENSIONS[d]['description']}"
        for d in dimensions
        if d in DIMENSIONS
    )

    # Build CV context
    cv_name = cv_extracted.get("name", "Unknown")
    experience_path = cv_extracted.get("experience_path", "path_a")
    anchor_points = cv_extracted.get("anchor_points", [])
    experience_entries = cv_extracted.get("experience", [])

    experience_summary = "\n".join(
        f"- {e.get('role', '?')} at {e.get('company', '?')} ({e.get('dates', '?')}): {e.get('description', '')[:200]}"
        for e in experience_entries[:5]
    )

    context_block = f"""
---
## ROLE-SPECIFIC CONFIGURATION (injected per assessment)

### Job Description
{jd}

### Selected Evaluation Dimensions
{dim_descriptions}

### Technical Depth Calibration
This interview uses the **{technical_depth}** depth register.

### Candidate Context
Name: {cv_name}
Experience Path: **{'Path A (relevant experience)' if experience_path == 'path_a' else 'Path B (no relevant experience)'}**

Key experiences to anchor questions on:
{chr(10).join(f'- {a}' for a in anchor_points)}

Experience summary:
{experience_summary}

### Interview Constraints
- Evaluate the pre-selected dimensions listed above
- Technical Depth dimension is mandatory for this technical role
- Follow the experience path structure ({experience_path.upper()}) throughout
- Anchor all questions in the candidate's stated experience where possible
---
"""

    return base + "\n\n" + context_block


async def process_message(
    assessment_id: str,
    candidate_message: str,
    role_config: dict,
    system_prompt: str,
    recording_path: str | None = None,
) -> AsyncIterator[str]:
    """
    Process a candidate's message and stream the AI interviewer's response.

    Appends both messages to the session, updates phase, and yields text chunks.
    """
    llm = get_llm_service()
    session = get_interview_session(assessment_id)
    if not session:
        yield "[Error: No interview session found]"
        return

    messages = session.get("messages", [])

    # Append candidate message
    user_msg = {
        "role": "user",
        "content": candidate_message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if recording_path:
        user_msg["recording_path"] = recording_path
    messages.append(user_msg)

    # Build messages for Claude (strip timestamps for API call)
    api_messages = [
        {"role": m["role"], "content": m["content"]}
        for m in messages
    ]

    # Stream the interviewer's response
    full_response = []
    async for chunk in llm.generate_stream(
        api_messages,
        system=system_prompt,
        model=MODEL_INTERVIEW,
        max_tokens=4096,
        temperature=0.4,
    ):
        full_response.append(chunk)
        yield chunk

    # Append assistant response
    assistant_text = "".join(full_response)
    messages.append({
        "role": "assistant",
        "content": assistant_text,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    # Detect phase from message count (rough heuristic — the agent manages phases internally)
    msg_count = len([m for m in messages if m["role"] == "user"])
    if msg_count <= 2:
        phase = "narrative_foundation"
    elif msg_count <= 8:
        phase = "dimension_assessment"
    elif msg_count <= 11:
        # Could be knowledge_reproduction, transfer_test, or comprehensive_challenge
        phase = "knowledge_reproduction"
    else:
        phase = "stress_test"

    # Check if the interviewer signals completion
    if any(signal in assistant_text.lower() for signal in [
        "conclude the interview",
        "that concludes our",
        "end of the assessment",
        "thank you for completing",
        "this concludes",
    ]):
        phase = "complete"

    # Update session
    update_interview_session(
        session["id"],
        messages=json.dumps(messages),
        current_phase=phase,
        updated_at=datetime.now(timezone.utc).isoformat(),
    )

    # If interview is complete, update assessment status
    if phase == "complete":
        update_assessment(
            assessment_id,
            status="completed",
            completed_at=datetime.now(timezone.utc).isoformat(),
        )


async def generate_reports(assessment_id: str, role_config: dict, cv_extracted: dict):
    """
    Generate both hirer and candidate reports from a completed interview.
    Called after the interview reaches the 'complete' phase.
    """
    session = get_interview_session(assessment_id)
    if not session:
        print(f"  [report] No session for assessment {assessment_id}")
        return

    transcript = session.get("messages", [])

    # Generate hirer report
    hirer_report = await generate_hirer_report(transcript, role_config, cv_extracted)
    save_report(assessment_id, "hirer", hirer_report)

    # Save dimension scores from hirer report
    scoring_summary = hirer_report.get("scoring_summary", [])
    if scoring_summary:
        save_dimension_scores(assessment_id, scoring_summary)

    # Generate candidate report
    candidate_report = await generate_candidate_report(transcript, role_config, cv_extracted)
    save_report(assessment_id, "candidate", candidate_report)

    print(f"  [report] Generated both reports for assessment {assessment_id}")
