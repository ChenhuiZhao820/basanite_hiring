"""
Report Generation Agent, generates hirer and candidate reports from interview transcripts.

Produces two distinct reports from the same assessment data:
- Hirer report: scores, evidence, capability map, cheating risk
- Candidate report: constructive feedback without revealing scoring methodology
"""
import os
import yaml
from core.llm import get_llm_service, MODEL_INTERVIEW

PROMPT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts")


def _load_prompt(name: str) -> str:
    path = os.path.join(PROMPT_DIR, f"{name}.yaml")
    with open(path, "r") as f:
        data = yaml.safe_load(f)
    return data.get("system", "")


async def generate_hirer_report(
    transcript: list[dict],
    role_config: dict,
    cv_extracted: dict,
) -> dict:
    """
    Generate the hirer-facing assessment report.

    Returns structured JSON with:
    - scoring_summary: dimension scores with quotation basis
    - top_excerpts: 3 conversation excerpts best representing genuine capability
    - capability_map: technical depth, transfer capability, blind spots, expert verification nodes
    - comprehensive_assessment: cheating risk + one-sentence summary
    """
    llm = get_llm_service()
    system = _load_prompt("generate_report_hirer")

    # Format transcript as readable conversation
    convo = "\n\n".join(
        f"{'INTERVIEWER' if m['role'] == 'assistant' else 'CANDIDATE'}: {m['content']}"
        for m in transcript
    )

    prompt = f"""Generate a hirer report for this completed interview assessment.

ROLE: {role_config.get('title', 'Unknown')}
JOB DESCRIPTION:
{role_config.get('job_description', 'Not provided')}

EVALUATED DIMENSIONS: {', '.join(role_config.get('dimensions', []))}
TECHNICAL DEPTH: {role_config.get('technical_depth', 'application')}
EXPERIENCE PATH: {cv_extracted.get('experience_path', 'unknown')}

CANDIDATE BACKGROUND:
{cv_extracted.get('name', 'Unknown')}
Anchor points: {cv_extracted.get('anchor_points', [])}

FULL INTERVIEW TRANSCRIPT:
{convo}

Generate the hirer report as JSON following this structure:
{{
  "scoring_summary": [
    {{"dimension": "...", "score": 1-5, "quotation_basis": "verbatim quote", "notes": "..."}}
  ],
  "top_excerpts": [
    {{"excerpt": "...", "why_selected": "...", "dimension": "...", "signal_type": "..."}}
  ],
  "capability_map": {{
    "demonstrated_depth": ["areas with genuine depth"],
    "surface_fluency": ["areas fluent but shallow"],
    "blind_spots": ["suspected blind spots with evidence"],
    "requires_expert_verification": ["claims exceeding AI judgment range"],
    "transfer_capability": "assessment of transfer test performance if applicable"
  }},
  "comprehensive_assessment": {{
    "cheating_risk": "low|medium|high",
    "cheating_signals": ["specific signals detected"],
    "one_sentence_summary": "what this person is likely to be like in a real technical work environment"
  }},
  "composite_score": 1-5
}}"""

    result = await llm.generate_json(prompt, system_instruction=system, model=MODEL_INTERVIEW, max_tokens=4096)
    return result


async def generate_candidate_report(
    transcript: list[dict],
    role_config: dict,
    cv_extracted: dict,
) -> dict:
    """
    Generate the candidate-facing feedback report.

    Constructive, non-reverse-engineerable. Does not reveal scoring methodology,
    specific dimensions evaluated, or question logic.
    """
    llm = get_llm_service()
    system = _load_prompt("generate_report_candidate")

    convo = "\n\n".join(
        f"{'INTERVIEWER' if m['role'] == 'assistant' else 'CANDIDATE'}: {m['content']}"
        for m in transcript
    )

    prompt = f"""Generate a candidate feedback report for this completed interview.

The report should be:
- Brief and neutral
- Acknowledge what they demonstrated well
- Identify areas to strengthen
- Offer constructive development suggestions
- NOT reveal specific evaluation dimensions, scoring criteria, or question logic
- NOT be reverse-engineerable to game future assessments

ROLE: {role_config.get('title', 'Unknown')}
CANDIDATE: {cv_extracted.get('name', 'Unknown')}

FULL INTERVIEW TRANSCRIPT:
{convo}

Generate the candidate report as JSON:
{{
  "summary": "brief neutral summary of performance",
  "strengths": ["areas where the candidate demonstrated well"],
  "areas_for_development": ["constructive suggestions for improvement"],
  "overall_impression": "respectful one-paragraph assessment"
}}"""

    result = await llm.generate_json(prompt, system_instruction=system, model=MODEL_INTERVIEW, max_tokens=2048)
    return result
