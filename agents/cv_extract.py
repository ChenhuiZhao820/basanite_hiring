"""
CV Extraction Agent, parses a candidate's CV into structured data.

Extracts experience history, education, skills, and projects
to personalize the interview and determine experience path (A vs B).
"""
import os
import yaml
from core.llm import get_llm_service, MODEL_FAST

PROMPT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts")


def _load_prompt(name: str) -> str:
    path = os.path.join(PROMPT_DIR, f"{name}.yaml")
    with open(path, "r") as f:
        data = yaml.safe_load(f)
    return data.get("system", "")


async def extract_cv(cv_text: str, job_description: str) -> dict:
    """
    Extract structured data from a CV for interview personalization.

    Returns:
        {
            "name": "...",
            "email": "...",
            "experience": [
                {"company": "...", "role": "...", "dates": "...", "description": "...", "relevant": true/false}
            ],
            "education": [
                {"institution": "...", "degree": "...", "dates": "...", "field": "..."}
            ],
            "skills": ["Python", "Kubernetes"...],
            "projects": [
                {"name": "...", "description": "...", "technologies": [...]}
            ],
            "experience_path": "path_a" | "path_b",
            "experience_path_rationale": "...",
            "anchor_points": ["specific experiences relevant to the role that the interviewer should probe"]
        }
    """
    llm = get_llm_service()
    system = _load_prompt("extract_cv")

    prompt = f"""Extract structured information from this CV for use in a technical interview.

Determine the experience path:
- "path_a": The candidate HAS work or project experience technically relevant to the target role
- "path_b": The candidate does NOT have relevant experience (recent graduate, career changer, non-traditional background)

Identify 2-4 "anchor points", specific experiences from the CV that are most relevant to the target role and that the interviewer should use as the basis for narrative-anchored questioning.

TARGET ROLE JOB DESCRIPTION:
{job_description}

CANDIDATE CV:
{cv_text}

Respond with JSON:
{{
  "name": "...",
  "email": "...",
  "experience": [...],
  "education": [...],
  "skills": [...],
  "projects": [...],
  "experience_path": "path_a" | "path_b",
  "experience_path_rationale": "...",
  "anchor_points": [...]
}}"""

    return await llm.generate_json(prompt, system_instruction=system, model=MODEL_FAST, max_tokens=2048)
