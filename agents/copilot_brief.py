"""
Copilot Brief Agent, generates the candidate-specific brief layer.

The role-level interview plan (roles.interview_plan) was approved and locked
at go-live; this agent adds only what the candidate's CV makes possible:
CV-anchored question angles per dimension and specific claims to verify.
"""
import os
import yaml

from core.llm import get_llm_service, MODEL_FAST
from core.sanitize import sanitize_untrusted
from core.schemas import CopilotBrief, validate_or_error
from agents.dimensions import DIMENSIONS

PROMPT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts")


def _load_prompt(name: str) -> str:
    path = os.path.join(PROMPT_DIR, f"{name}.yaml")
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("system", "")


def _plan_block(plan: dict) -> str:
    """Serialise the locked plan for the prompt, sanitising every field
    (it's hirer-edited content)."""
    lines: list[str] = []
    overview = sanitize_untrusted(plan.get("overview") or "", 2000)
    if overview:
        lines.append(f"Overview: {overview}")
    for dp in (plan.get("dimension_plans") or [])[:10]:
        if not isinstance(dp, dict):
            continue
        key = dp.get("dimension") or ""
        name = DIMENSIONS.get(key, {}).get("name") or sanitize_untrusted(key, 80)
        lines.append(f"\nDimension: {key} ({name})")
        for field, label in (
            ("focus", "Focus"),
            ("probing_strategy", "Probing strategy"),
            ("evaluation_criteria", "Evaluation criteria"),
        ):
            val = sanitize_untrusted(dp.get(field) or "", 1000)
            if val:
                lines.append(f"  {label}: {val}")
    return "\n".join(lines)


def _cv_block(cv_extracted: dict) -> str:
    name = sanitize_untrusted(cv_extracted.get("name") or "", 120) or "Unknown"
    anchors = [
        sanitize_untrusted(a, 200)
        for a in (cv_extracted.get("anchor_points") or [])[:10]
    ]
    experience = (cv_extracted.get("experience") or [])[:6]
    exp_lines = "\n".join(
        f"- {sanitize_untrusted(e.get('role'), 120) or '?'}"
        f" at {sanitize_untrusted(e.get('company'), 120) or '?'}"
        f" ({sanitize_untrusted(e.get('dates'), 60) or '?'}):"
        f" {sanitize_untrusted(e.get('description'), 500)}"
        for e in experience
        if isinstance(e, dict)
    )
    anchors_block = "\n".join(f"- {a}" for a in anchors if a) or "(none extracted)"
    return (
        f"Name: {name}\n"
        f"Anchor points:\n{anchors_block}\n"
        f"Experience:\n{exp_lines or '(none extracted)'}"
    )


async def generate_copilot_brief(role: dict, cv_extracted: dict) -> dict:
    """
    Generate the candidate-specific brief layer for a copilot session.

    Returns:
        {
            "candidate_summary": "...",
            "dimension_briefs": [
                {"dimension": "...", "cv_anchored_angles": [...], "claims_to_verify": [...]},
                ...
            ]
        }
    or the {"error": ...} sentinel on parse/validation failure.
    """
    llm = get_llm_service()

    plan = role.get("interview_plan") or {}
    dimensions = [d for d in (role.get("dimensions") or []) if d in DIMENSIONS]
    title_safe = sanitize_untrusted(role.get("title", ""), 200) or "this role"

    system = _load_prompt("generate_copilot_brief")

    prompt = f"""Brief the interviewer for the candidate below.

Role: {title_safe}
Dimensions to cover (one dimension_briefs entry per key, in this order):
{chr(10).join(f'- {d}' for d in dimensions)}

<interview_plan>
{_plan_block(plan)}
</interview_plan>

<candidate_context>
{_cv_block(cv_extracted or {})}
</candidate_context>

Respond with JSON:
{{
  "candidate_summary": "2-3 factual sentences about this candidate for the interviewer",
  "dimension_briefs": [
    {{
      "dimension": "dimension_key",
      "cv_anchored_angles": ["concrete opening tied to a named CV experience", "..."],
      "claims_to_verify": ["specific checkable CV claim this dimension makes load-bearing", "..."]
    }}
  ]
}}"""

    raw = await llm.generate_json(prompt, system_instruction=system, model=MODEL_FAST, max_tokens=3000)
    return validate_or_error(raw, CopilotBrief)
