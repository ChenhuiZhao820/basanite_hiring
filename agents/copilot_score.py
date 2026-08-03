"""
Copilot Score Agent, the full Sonnet wrap-up pass for a copilot session.

Produces proposed dimension scores (with verbatim citations) plus a synthesis
paragraph draft. The interviewer reviews, confirms or overrides on the review
screen; nothing here is a score of record until a human signs it off.
"""
import os
import yaml

from core.llm import get_llm_service, MODEL_INTERVIEW
from core.sanitize import sanitize_untrusted
from core.schemas import CopilotProposedReview, validate_or_error
from agents.dimensions import DIMENSIONS
from agents.report import _normalise_for_match

PROMPT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts")

_MAX_SEGMENT_CHARS = 10000


def _load_prompt(name: str) -> str:
    path = os.path.join(PROMPT_DIR, f"{name}.yaml")
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("system", "")


def _transcript_text(segments: list[dict], include_speakers: bool = True) -> str:
    """Speaker labels (diarized bot-join sessions) are prefixed onto lines
    for the prompt; the quote-verification haystack uses the bare text so a
    citation never fails just because it lacks the "Name:" prefix."""
    lines: list[str] = []
    for seg in segments or []:
        if not isinstance(seg, dict):
            continue
        text = sanitize_untrusted(seg.get("text"), _MAX_SEGMENT_CHARS)
        if not text:
            continue
        speaker = sanitize_untrusted(seg.get("speaker") or "", 120) if include_speakers else ""
        lines.append(f"{speaker}: {text}" if speaker else text)
    return "\n\n".join(lines)


def _rubric_block(role: dict) -> str:
    plan = role.get("interview_plan") or {}
    plan_dims = {
        dp.get("dimension"): dp
        for dp in (plan.get("dimension_plans") or [])
        if isinstance(dp, dict)
    }
    lines: list[str] = []
    for key in role.get("dimensions") or []:
        if key not in DIMENSIONS:
            continue
        dp = plan_dims.get(key) or {}
        criteria = sanitize_untrusted(dp.get("evaluation_criteria") or "", 1000)
        lines.append(f"- {key} ({DIMENSIONS[key]['name']}): {DIMENSIONS[key]['description']}")
        if criteria:
            lines.append(f"  Approved evaluation criteria: {criteria}")
    return "\n".join(lines)


def _verify_and_cap(review: dict, transcript_text: str) -> dict:
    """Enforce the evidential rule mechanically: a proposed score above 3
    whose quotation doesn't appear in the transcript is capped at 3 and
    marked unverified. Mirrors agents.report._verify_hirer_quotes; the
    haystack here is the whole unattributed transcript (no diarization), so
    verification is necessarily looser than the autonomous path — the
    reviewing human sees the `verified` flag either way.
    """
    haystack = _normalise_for_match(transcript_text)
    for row in review.get("proposed_scores") or []:
        if not isinstance(row, dict):
            continue
        quote = _normalise_for_match(row.get("quotation_basis") or "")
        verified = bool(quote) and quote in haystack
        row["verified"] = verified
        score = row.get("score")
        if not verified and isinstance(score, int) and score > 3:
            row["score"] = 3
            note = (row.get("notes") or "").strip()
            row["notes"] = (
                f"{note} [Score capped at 3: the cited quote could not be "
                f"verified against the transcript.]"
            ).strip()
    return review


async def generate_proposed_review(role: dict, session: dict, cv_extracted: dict) -> dict:
    """
    Run the wrap-up pass. Returns

        {"proposed_scores": [{"dimension", "score", "quotation_basis",
                              "notes", "verified"}, ...],
         "synthesis": "..."}

    or the {"error": ...} sentinel.
    """
    transcript = session.get("transcript") or []
    text = _transcript_text(transcript)
    if not text.strip():
        return {"error": "empty_transcript"}

    llm = get_llm_service()
    system = _load_prompt("copilot_score")

    role_title = sanitize_untrusted(role.get("title"), 200) or "Unknown"
    jd = sanitize_untrusted(role.get("job_description"), 15000) or "Not provided"
    dimensions = [d for d in (role.get("dimensions") or []) if d in DIMENSIONS]
    cv_name = sanitize_untrusted((cv_extracted or {}).get("name") or "", 120) or "Unknown"
    anchors = "\n".join(
        f"- {sanitize_untrusted(a, 200)}"
        for a in ((cv_extracted or {}).get("anchor_points") or [])[:10]
    ) or "(none extracted)"

    prompt = f"""Score this completed human-led interview and draft the synthesis.

ROLE: {role_title}
JOB DESCRIPTION:
{jd}

DIMENSIONS AND APPROVED RUBRIC (score each, in this order):
{_rubric_block(role)}

<candidate_context>
Name: {cv_name}
CV anchor points:
{anchors}
</candidate_context>

<interview_transcript>
{text}
</interview_transcript>

Respond with JSON:
{{
  "proposed_scores": [
    {{
      "dimension": "dimension_key",
      "score": 1-5,
      "quotation_basis": "verbatim candidate statement from the transcript",
      "notes": "1-3 sentences referencing the evaluation criteria"
    }}
  ],
  "synthesis": "4-6 sentences: what this candidate is likely to be like in a real working environment"
}}"""

    raw = await llm.generate_json(
        prompt, system_instruction=system, model=MODEL_INTERVIEW, max_tokens=4096
    )
    result = validate_or_error(raw, CopilotProposedReview)
    if result.get("error"):
        return result
    # Keep only selected dimensions, in role order.
    by_key = {
        r.get("dimension"): r
        for r in result.get("proposed_scores") or []
        if isinstance(r, dict)
    }
    result["proposed_scores"] = [by_key[d] for d in dimensions if d in by_key]
    # Verify citations against the bare utterances (no speaker prefixes).
    return _verify_and_cap(result, _transcript_text(transcript, include_speakers=False))
