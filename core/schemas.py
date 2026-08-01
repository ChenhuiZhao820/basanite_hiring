"""ENG-21: Pydantic schemas for LLM JSON outputs.

Each agent that asks Claude for JSON has an expected shape. Without
validation, a slightly-malformed response (extra/missing fields, wrong
types, garbled enums, prompt-injection-coerced output) flows downstream
and corrupts the assessment — sometimes silently. This module defines
the canonical output shape for each agent, plus a `validate_or_error`
helper that returns a `{"error": ...}` sentinel when the LLM payload
doesn't match.

Validation policy (per audit guidance):
- Validate at the agent boundary, not deep inside callers.
- Be permissive on extra fields (LLMs may add noise) but strict on
  required fields and enums.
- On failure, return the same `{"error": ...}` sentinel that core.llm
  uses on parse failures, so call sites only need one error path.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator


def _coerce_str_list(v: Any) -> Any:
    """Coerce an LLM-emitted list into a list of plain strings.

    Anthropic JSON mode frequently returns list-of-string fields (anchor
    points, skills) as list-of-objects instead — e.g. anchor_points as
    [{"experience": "...", "relevance": "..."}] rather than ["..."]. That
    type drift previously failed validation outright, and the resulting
    error sentinel got persisted as the candidate's cv_extracted, leaving
    the interview with NO CV grounding. Rather than reject, flatten each
    item to a readable string so the extraction survives the drift.
    """
    if not isinstance(v, list):
        return v
    out: list[str] = []
    for item in v:
        if isinstance(item, str):
            s = item.strip()
        elif isinstance(item, dict):
            # Join the dict's string-ish values into one readable line.
            parts = [str(val).strip() for val in item.values() if val not in (None, "")]
            s = " — ".join(parts)
        elif item is None:
            s = ""
        else:
            s = str(item).strip()
        if s:
            out.append(s)
    return out


# ───────────────────────── CV extraction ──────────────────────────


class _LooseModel(BaseModel):
    """Base config: ignore extra LLM-emitted fields rather than reject them.

    Anthropic JSON mode is good but not infallible — occasional drift
    (an extra "_thoughts" key, a stray "summary") shouldn't poison the
    whole output. We validate the *required* shape and tolerate noise.
    """

    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    @field_validator("*", mode="before")
    @classmethod
    def _none_to_empty_str(cls, v, info):
        """Coerce a JSON null into "" for non-optional str fields.

        The LLM frequently emits `null` for a string it has no value for —
        e.g. quotation_basis when an interview produced no quotable answer.
        A plain `str` field rejects null, which previously detonated the
        ENTIRE hirer report into a schema_validation_failed sentinel (the
        hirer then saw a "completed" candidate with no scores). Only fields
        annotated exactly `str` are coerced; Optional[str] fields keep their
        null, and non-string fields are untouched.
        """
        if v is None:
            field = cls.model_fields.get(info.field_name)
            if field is not None and field.annotation is str:
                return ""
        return v


class CvExperienceEntry(_LooseModel):
    company: str | None = None
    role: str | None = None
    dates: str | None = None
    description: str | None = None
    relevant: bool | None = None


class CvEducationEntry(_LooseModel):
    institution: str | None = None
    degree: str | None = None
    dates: str | None = None
    field: str | None = None


class CvProjectEntry(_LooseModel):
    name: str | None = None
    description: str | None = None
    technologies: list[str] = Field(default_factory=list)


class CvExtracted(_LooseModel):
    name: str = ""
    email: str = ""
    experience: list[CvExperienceEntry] = Field(default_factory=list)
    education: list[CvEducationEntry] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    projects: list[CvProjectEntry] = Field(default_factory=list)
    experience_path: Literal["path_a", "path_b"] = "path_a"
    experience_path_rationale: str = ""
    anchor_points: list[str] = Field(default_factory=list)

    # Haiku often returns these list-of-string fields as list-of-objects;
    # coerce before validation so the drift doesn't void the whole extraction.
    @field_validator("anchor_points", "skills", mode="before")
    @classmethod
    def _coerce_string_lists(cls, v: Any) -> Any:
        return _coerce_str_list(v)


# ───────────────────────── Dimension recommendation ───────────────


_VALID_DIMENSION_KEYS = (
    "judgment_under_ambiguity",
    "tacit_knowledge",
    "intuition_under_scarcity",
    "psychological_safety",
    "creative_reframing",
    "ethical_reasoning",
    "capacity_for_change",
    "technical_depth",
)


class DimensionRecommendation(_LooseModel):
    dimensions: list[str] = Field(default_factory=list)
    technical_depth: Literal["application", "research_architecture"] = "application"
    rationale: dict[str, str] = Field(default_factory=dict)


# ───────────────────────── JD upload validation ───────────────────


class JdValidation(_LooseModel):
    """Classifier verdict on an uploaded "job description" document.

    Produced by agents.jd_validate. Defaults are deliberately permissive
    (accept, no injection) so a partially-malformed LLM response degrades
    to letting a legitimate hirer through rather than blocking them.
    """

    document_type: Literal["job_description", "cv_or_resume", "other"] = "job_description"
    document_type_hint: str = ""
    is_job_description: bool = True
    confidence: Literal["high", "low"] = "low"
    injection_risk: Literal["none", "suspicious", "clear_attempt"] = "none"
    injection_evidence: list[str] = Field(default_factory=list)

    @field_validator("injection_evidence", mode="before")
    @classmethod
    def _coerce_evidence(cls, v: Any) -> Any:
        return _coerce_str_list(v)


# ───────────────────────── Hirer report ───────────────────────────


class ScoringRow(_LooseModel):
    dimension: str
    # Permit floats so we can validate the canonical [1, 5] range below.
    score: float = Field(ge=1, le=5)
    quotation_basis: str = ""
    notes: str = ""
    # ENG-25: set False after report generation if the quotation cannot be
    # found in the candidate's transcript (hallucinated quote). True is the
    # safe default for legacy data and for cases where verification ran and
    # the quote was confirmed.
    verified: bool = True


class TopExcerpt(_LooseModel):
    excerpt: str
    why_selected: str = ""
    dimension: str = ""
    signal_type: str = ""
    verified: bool = True


class CapabilityMap(_LooseModel):
    demonstrated_depth: list[str] = Field(default_factory=list)
    surface_fluency: list[str] = Field(default_factory=list)
    blind_spots: list[str] = Field(default_factory=list)
    requires_expert_verification: list[str] = Field(default_factory=list)
    transfer_capability: str = ""


class ComprehensiveAssessment(_LooseModel):
    cheating_risk: Literal["low", "medium", "high"] = "low"
    cheating_signals: list[str] = Field(default_factory=list)
    one_sentence_summary: str = ""


class AtAGlance(_LooseModel):
    tags: list[str] = Field(default_factory=list)
    summary: str = ""


# Next-round routing tier. This is NOT a hire/no-hire signal — the
# hiring decision stays with humans. It's a tier the hirer can use to
# triage their pipeline: who advances to the next interview round, who
# gets a courtesy decline. Five levels mirror the rubric Lynn agreed
# on; rationale is a short justification rooted in the dimension scores.
RecommendationTier = Literal[
    "strongly_recommended",
    "recommended",
    "can_progress",
    "not_recommended",
    "strongly_not_recommended",
]


def derive_recommendation(composite_score: float | None) -> RecommendationTier:
    """Map a 1-5 composite score to a routing tier.

    Used as a fallback for legacy reports written before the model
    emitted `recommendation` directly. The bands are deliberately wide
    at the extremes (a 4.5+ is unambiguously a strong yes; a sub-2 is
    unambiguously a no) and narrower in the middle where the model
    should ideally be picking between "recommended" and "can_progress"
    on more than just the number.
    """
    s = float(composite_score if composite_score is not None else 3.0)
    if s >= 4.25:
        return "strongly_recommended"
    if s >= 3.5:
        return "recommended"
    if s >= 2.75:
        return "can_progress"
    if s >= 2.0:
        return "not_recommended"
    return "strongly_not_recommended"


class HirerReport(_LooseModel):
    scoring_summary: list[ScoringRow] = Field(default_factory=list)
    top_excerpts: list[TopExcerpt] = Field(default_factory=list)
    capability_map: CapabilityMap = Field(default_factory=CapabilityMap)
    comprehensive_assessment: ComprehensiveAssessment = Field(default_factory=ComprehensiveAssessment)
    composite_score: float = Field(default=3.0, ge=1, le=5)
    # Routing recommendation for the next interview round, NOT a
    # hire/no-hire call. Optional so legacy rows still validate; the
    # `derive_recommendation` fallback fills the gap on read.
    recommendation: RecommendationTier | None = None
    recommendation_rationale: str = ""
    # Two-sentence executive summary for the top-of-report callout.
    # Optional so legacy rows still validate; renderer falls back to
    # recommendation_rationale / one_sentence_summary.
    headline_summary: str = ""
    at_a_glance: AtAGlance = Field(default_factory=AtAGlance)


# ───────────────────────── Candidate report ───────────────────────


class CandidateReport(_LooseModel):
    summary: str = ""
    strengths: list[str] = Field(default_factory=list)
    areas_for_development: list[str] = Field(default_factory=list)
    overall_impression: str = ""


# ───────────────────────── Director directive ─────────────────────


class DirectorDirective(_LooseModel):
    # Director may emit a string directive, the literal "wrap_now", or the
    # JSON null sentinel. Pydantic models the latter as None.
    directive: str | None = None
    reasoning: str = ""


# ───────────────────────── Validation helper ──────────────────────


def validate_or_error(raw: Any, model_cls: type[BaseModel]) -> dict:
    """Validate `raw` against `model_cls` and return the dict form.

    On any of:
      - raw is not a dict (LLM returned a list / scalar)
      - raw already carries the {"error": ...} sentinel from core.llm
      - validation fails (wrong types, missing required fields, bad enum)
    we return `{"error": "schema_validation_failed", "code": "...", ...}`.

    Callers only need to check `if result.get("error"):` for both the
    upstream parse-error case and the schema case.
    """
    if not isinstance(raw, dict):
        return {"error": "schema_validation_failed", "code": "not_a_dict"}
    if "error" in raw and "directive" not in raw:
        # Upstream error sentinel from core.llm. Pass through unchanged
        # so existing callers see the same shape they used to. (Director
        # uses "directive" alongside an "error" only when it's setting
        # both deliberately — preserve that edge case.)
        return raw
    try:
        validated = model_cls.model_validate(raw)
    except ValidationError as e:
        return {
            "error": "schema_validation_failed",
            "code": "shape_mismatch",
            "details": _summarise_errors(e),
        }
    return validated.model_dump(mode="python")


def _summarise_errors(e: ValidationError) -> list[str]:
    """Compact, log-safe error summary. Avoids dumping the full LLM payload."""
    out: list[str] = []
    for err in e.errors()[:5]:
        loc = ".".join(str(x) for x in err.get("loc", ()))
        out.append(f"{loc}: {err.get('type', 'invalid')}")
    return out
