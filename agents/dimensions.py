"""
Dimension Recommendation Agent, recommends evaluation dimensions from a job description.

Given a JD, recommends 3-4 dimensions from the 8 available and calibrates technical depth.
"""
import os
import yaml
from core.llm import get_llm_service, MODEL_FAST

DIMENSIONS = {
    "judgment_under_ambiguity": {
        "name": "Judgment Under Ambiguity",
        "description": "The capacity to act decisively on incomplete information, without either paralysis or false confidence.",
    },
    "tacit_knowledge": {
        "name": "Tacit Knowledge Extraction",
        "description": "The ability to surface and transmit knowledge that lives in experience rather than in text.",
    },
    "intuition_under_scarcity": {
        "name": "Intuition Under Data Scarcity",
        "description": "Sound intuition in the absence of sufficient data, the recognition-primed judgment that distinguishes genuine experts.",
    },
    "psychological_safety": {
        "name": "Psychological Safety & Collective Learning",
        "description": "The social and epistemic conditions under which teams can correct their own errors before they compound.",
    },
    "creative_reframing": {
        "name": "Creative Problem Reframing",
        "description": "The ability to recognize when the team is solving the wrong problem.",
    },
    "ethical_reasoning": {
        "name": "Ethical Reasoning",
        "description": "The capacity to feel the weight of real tradeoffs and navigate them with integrity.",
    },
    "capacity_for_change": {
        "name": "Capacity to Be Changed by Experience",
        "description": "The metacognitive self-awareness that separates those who accumulate experience from those who learn from it.",
    },
    "technical_depth": {
        "name": "Technical Judgment Depth & Boundary Awareness",
        "description": "Mandatory for technical roles. Whether the candidate understands the limits and tradeoffs of their technical decisions.",
    },
}

PROMPT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts")


def _load_prompt(name: str) -> str:
    path = os.path.join(PROMPT_DIR, f"{name}.yaml")
    with open(path, "r") as f:
        data = yaml.safe_load(f)
    return data.get("system", "")


async def recommend_dimensions(job_description: str) -> dict:
    """
    Analyze a JD and recommend evaluation dimensions + technical depth calibration.

    Returns:
        {
            "dimensions": ["judgment_under_ambiguity", "technical_depth"...],
            "technical_depth": "application" | "research_architecture",
            "rationale": {"dimension_key": "why this dimension matters for this role"...}
        }
    """
    llm = get_llm_service()

    dimension_list = "\n".join(
        f"- {key}: {d['name']}, {d['description']}"
        for key, d in DIMENSIONS.items()
    )

    system = _load_prompt("recommend_dimensions")

    prompt = f"""Analyze the following job description and recommend 3-4 evaluation dimensions from the available set. For technical roles, 'technical_depth' is mandatory.

Also determine the technical depth calibration:
- "application", roles focused on using existing tools/frameworks to solve business problems (frontend/backend engineer, data analyst, DevOps)
- "research_architecture", roles focused on understanding/improving/designing underlying systems (ML researcher, systems architect, platform engineer)

AVAILABLE DIMENSIONS:
{dimension_list}

JOB DESCRIPTION:
{job_description}

Respond with JSON:
{{
  "dimensions": ["dimension_key_1", "dimension_key_2"...],
  "technical_depth": "application" | "research_architecture",
  "rationale": {{
    "dimension_key": "one-sentence explanation of why this dimension is relevant"
  }}
}}"""

    return await llm.generate_json(prompt, system_instruction=system, model=MODEL_FAST, max_tokens=1024)
