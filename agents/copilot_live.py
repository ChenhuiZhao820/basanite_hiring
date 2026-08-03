"""
Copilot Live Agent, one analysis tick over the rolling interview transcript.

Runs on Haiku for latency: the interviewer's panel refreshes every tick, so
this must return in a couple of seconds. The full-quality Sonnet pass happens
once at wrap-up (agents.copilot_score).
"""
import os
import yaml

from core.llm import get_llm_service, MODEL_FAST
from core.sanitize import sanitize_untrusted
from core.schemas import CopilotLiveOutput, validate_or_error
from agents.dimensions import DIMENSIONS

PROMPT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts")

# Per-segment cap mirrors the report agent's per-turn cap rationale.
_MAX_SEGMENT_CHARS = 4000
# Keep the rolling window bounded so tick latency stays flat in long calls.
_MAX_SEGMENTS = 120


def _load_prompt(name: str) -> str:
    path = os.path.join(PROMPT_DIR, f"{name}.yaml")
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("system", "")


def _rubric_block(role: dict) -> str:
    """Per-dimension evaluation criteria from the locked interview plan,
    falling back to the generic dimension description when absent."""
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
        strategy = sanitize_untrusted(dp.get("probing_strategy") or "", 1000)
        questions = [
            sanitize_untrusted(q, 300)
            for q in (dp.get("example_questions") or [])[:3]
        ]
        lines.append(f"Dimension: {key} ({DIMENSIONS[key]['name']})")
        lines.append(f"  Description: {DIMENSIONS[key]['description']}")
        if criteria:
            lines.append(f"  Strong vs weak evidence (approved for this role): {criteria}")
        if strategy:
            lines.append(f"  Approved probing strategy: {strategy}")
        qs = [q for q in questions if q]
        if qs:
            lines.append("  Approved example angles: " + " | ".join(qs))
    return "\n".join(lines)


def _transcript_block(segments: list[dict]) -> str:
    """Bot-joined sessions carry diarized `speaker` labels (prefixed onto the
    line); browser-captured sessions don't, and the model attributes turns
    from content per the system prompt."""
    lines: list[str] = []
    for seg in (segments or [])[-_MAX_SEGMENTS:]:
        if not isinstance(seg, dict):
            continue
        text = sanitize_untrusted(seg.get("text"), _MAX_SEGMENT_CHARS)
        if not text:
            continue
        elapsed = seg.get("elapsed_seconds")
        stamp = f"[{int(elapsed) // 60}:{int(elapsed) % 60:02d}] " if isinstance(elapsed, (int, float)) else ""
        speaker = sanitize_untrusted(seg.get("speaker") or "", 120)
        prefix = f"{speaker}: " if speaker else ""
        lines.append(f"{stamp}{prefix}{text}")
    return "\n".join(lines)


def _brief_block(brief_pack: dict | None) -> str:
    if not isinstance(brief_pack, dict):
        return ""
    parts: list[str] = []
    summary = sanitize_untrusted(brief_pack.get("candidate_summary") or "", 800)
    if summary:
        parts.append(f"Candidate summary: {summary}")
    for db_ in (brief_pack.get("dimension_briefs") or [])[:10]:
        if not isinstance(db_, dict):
            continue
        claims = [
            sanitize_untrusted(c, 300)
            for c in (db_.get("claims_to_verify") or [])[:3]
        ]
        claims = [c for c in claims if c]
        if claims:
            parts.append(f"{db_.get('dimension')}: verify — " + " | ".join(claims))
    return "\n".join(parts)


async def copilot_tick(
    role: dict,
    session: dict,
    elapsed_seconds: int,
) -> dict:
    """
    Run one live analysis pass. Returns the validated panel payload

        {"saturation": {...}, "probe": {...}|None,
         "authenticity_flags": [...], "pacing": "..."}

    or the {"error": ...} sentinel. Callers should skip the tick (keep the
    previous panel state) on error rather than surfacing it mid-interview.
    """
    transcript = session.get("transcript") or []
    if not transcript:
        return {"error": "empty_transcript"}

    llm = get_llm_service()
    system = _load_prompt("copilot_live")

    duration_minutes = role.get("interview_duration_minutes", 30)
    prev_state = session.get("live_state") or {}
    prev_saturation = prev_state.get("saturation") or {}

    prompt = f"""Analyse the live interview below and refresh the panel.

Target length: ~{duration_minutes} minutes. Elapsed: {elapsed_seconds // 60}m{elapsed_seconds % 60:02d}s.

DIMENSIONS AND APPROVED RUBRIC:
{_rubric_block(role)}

Previous saturation state (only raise on new concrete evidence):
{prev_saturation}

<candidate_brief>
{_brief_block(session.get("brief_pack"))}
</candidate_brief>

<transcript>
{_transcript_block(transcript)}
</transcript>

Respond with JSON:
{{
  "saturation": {{"dimension_key": "none|partial|saturated", ...}},
  "probe": {{
    "dimension": "dimension_key",
    "technique": "technique name from the trigger table, or Opening",
    "text": "one sentence, ready to ask aloud",
    "reason": "one short line naming what was just heard"
  }} or null,
  "authenticity_flags": ["neutral note", ...],
  "pacing": "one short line, or empty string"
}}"""

    raw = await llm.generate_json(prompt, system_instruction=system, model=MODEL_FAST, max_tokens=1500)
    result = validate_or_error(raw, CopilotLiveOutput)
    if result.get("error"):
        return result

    # Belt-and-braces: only selected dimensions appear, and saturation never
    # regresses relative to the previous tick (evidence doesn't un-happen).
    order = {"none": 0, "partial": 1, "saturated": 2}
    selected = [d for d in (role.get("dimensions") or []) if d in DIMENSIONS]
    merged: dict[str, str] = {}
    for key in selected:
        new = result.get("saturation", {}).get(key, "none")
        old = prev_saturation.get(key, "none")
        merged[key] = new if order.get(new, 0) >= order.get(old, 0) else old
    result["saturation"] = merged
    return result
