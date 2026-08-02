"""
Interview Plan Agent, generates a hirer-readable interview plan for a role.

Given the role config (JD + selected dimensions + duration + technical depth),
produces a structured plan describing how the agent will conduct the interview
and evaluate candidates. Shown on the hirer dashboard; editable while the role
is in draft, locked once live.
"""
import os
import yaml
from core.llm import get_llm_service, MODEL_FAST
from core.sanitize import sanitize_untrusted
from core.schemas import InterviewPlan, validate_or_error
from agents.dimensions import DIMENSIONS

# Match the cap used by the other JD consumers.
_JD_MAX_CHARS = 15_000

PROMPT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts")


def _load_prompt(name: str) -> str:
    path = os.path.join(PROMPT_DIR, f"{name}.yaml")
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("system", "")


async def generate_interview_plan(role: dict) -> dict:
    """
    Generate a structured interview plan from a role's configuration.

    Returns:
        {
            "overview": "...",
            "opening_approach": "...",
            "dimension_plans": [
                {
                    "dimension": "judgment_under_ambiguity",
                    "focus": "...",
                    "probing_strategy": "...",
                    "evaluation_criteria": "...",
                    "example_questions": ["...", "..."]
                }, ...
            ],
            "closing_approach": "..."
        }
    or the {"error": ...} sentinel on parse/validation failure.
    """
    llm = get_llm_service()

    dimensions = [d for d in (role.get("dimensions") or []) if d in DIMENSIONS]
    dimension_list = "\n".join(
        f"- {key}: {DIMENSIONS[key]['name']}, {DIMENSIONS[key]['description']}"
        for key in dimensions
    )

    system = _load_prompt("generate_interview_plan")

    jd_safe = sanitize_untrusted(role.get("job_description", ""), _JD_MAX_CHARS)
    title_safe = sanitize_untrusted(role.get("title", ""), 200) or "this role"
    company_safe = sanitize_untrusted(role.get("company_name") or "", 200) or "the hiring company"
    custom = sanitize_untrusted(role.get("custom_instructions") or "", 2000)
    duration = role.get("interview_duration_minutes", 20)
    technical_depth = role.get("technical_depth", "application")

    custom_block = (
        f"\n<custom_instructions>\n{custom}\n</custom_instructions>\n"
        if custom else ""
    )

    prompt = f"""Write the interview plan for the role below.

Role: {title_safe} at {company_safe}
Target interview length: ~{duration} minutes (voice conversation)
Technical depth register: {technical_depth}

SELECTED EVALUATION DIMENSIONS (plan one section per dimension, in this order):
{dimension_list}

<job_description>
{jd_safe}
</job_description>
{custom_block}
Respond with JSON:
{{
  "overview": "2-4 sentences: how the interview will run overall for this role",
  "opening_approach": "2-3 sentences: how the interviewer opens and settles the candidate",
  "dimension_plans": [
    {{
      "dimension": "dimension_key",
      "focus": "what the interviewer looks for in this dimension, for this role",
      "probing_strategy": "how it digs beneath surface answers",
      "evaluation_criteria": "what strong vs weak evidence looks like",
      "example_questions": ["...", "..."]
    }}
  ],
  "closing_approach": "1-2 sentences: how the interview wraps up"
}}"""

    raw = await llm.generate_json(prompt, system_instruction=system, model=MODEL_FAST, max_tokens=4096)
    return validate_or_error(raw, InterviewPlan)
