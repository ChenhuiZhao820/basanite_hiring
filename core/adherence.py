"""
Plan adherence for Copilot sessions — fully deterministic, no LLM calls.

Compares what the approved interview plan intended with what the session
actually recorded, using only artefacts the live loop already produced:

- dimension coverage    <- the final tick's saturation map
- probe uptake          <- copilot_probe_events counts
- planned-angle usage   <- near-verbatim lexical matching of the plan's
                           example questions against transcript utterances

Framing matters: this is observation, not a grade. Deviating from plan is
often correct interviewing, so the output uses neutral language ("skipped",
not "failed") and is surfaced as context for interpreting scores.
"""
from agents.report import _normalise_for_match

# A planned question counts as "asked near-verbatim" when at least this
# share of its (normalised) tokens appear in a single utterance. Catches
# trailing rewords ("...in your last role?") without admitting loose
# thematic overlap; paraphrases deliberately do NOT count, and the UI copy
# says "near-verbatim" for exactly that reason.
_TOKEN_CONTAINMENT_THRESHOLD = 0.7
# Questions shorter than this many tokens are too generic for containment
# matching to mean anything ("Why?", "Tell me more") — require substring.
_MIN_TOKENS_FOR_CONTAINMENT = 5

_COVERAGE_FROM_SATURATION = {"saturated": "covered", "partial": "partial", "none": "skipped"}


def _question_asked(question_norm: str, question_tokens: set[str], utterances_norm: list[str]) -> bool:
    if not question_norm:
        return False
    for utt in utterances_norm:
        if question_norm in utt:
            return True
        if len(question_tokens) >= _MIN_TOKENS_FOR_CONTAINMENT:
            utt_tokens = set(utt.split())
            if len(question_tokens & utt_tokens) / len(question_tokens) >= _TOKEN_CONTAINMENT_THRESHOLD:
                return True
    return False


def compute_plan_adherence(
    plan: dict,
    dimensions: list[str],
    live_state: dict | None,
    probe_events: list[dict],
    transcript: list[dict],
) -> dict:
    """Assemble the plan-adherence overview for a completed copilot session.

    Pure function over already-persisted session data; safe to recompute.
    """
    saturation = (live_state or {}).get("saturation") or {}
    coverage = {
        d: _COVERAGE_FROM_SATURATION.get(saturation.get(d, "none"), "skipped")
        for d in dimensions
    }
    counts = {"covered": 0, "partial": 0, "skipped": 0}
    for level in coverage.values():
        counts[level] += 1

    # ── Probe uptake (overall + per dimension) ──────────────────────────
    uptake = {"suggested": 0, "asked": 0, "adapted": 0, "dismissed": 0}
    by_dimension: dict[str, dict] = {}
    for event in probe_events or []:
        action = event.get("action")
        if action not in uptake:
            continue
        uptake[action] += 1
        dim = event.get("dimension_key")
        if dim:
            row = by_dimension.setdefault(
                dim, {"suggested": 0, "asked": 0, "adapted": 0, "dismissed": 0}
            )
            row[action] += 1
    resolved = uptake["asked"] + uptake["adapted"] + uptake["dismissed"]
    uptake_rate = (
        round((uptake["asked"] + uptake["adapted"]) / resolved, 2) if resolved else None
    )

    # ── Planned-angle usage (near-verbatim only, by design) ────────────
    utterances_norm = [
        _normalise_for_match(seg.get("text") or "")
        for seg in (transcript or [])
        if isinstance(seg, dict) and (seg.get("text") or "").strip()
    ]
    total_questions = 0
    matched: list[dict] = []
    for dp in (plan or {}).get("dimension_plans") or []:
        if not isinstance(dp, dict) or dp.get("dimension") not in dimensions:
            continue
        for question in dp.get("example_questions") or []:
            q_norm = _normalise_for_match(str(question or ""))
            if not q_norm:
                continue
            total_questions += 1
            if _question_asked(q_norm, set(q_norm.split()), utterances_norm):
                matched.append({"dimension": dp["dimension"], "question": str(question)})

    # ── Template summary — assembled, never generated ────────────────────
    reached = counts["covered"] + counts["partial"]
    lines = []
    if dimensions:
        line = f"{reached} of {len(dimensions)} dimensions reached at least partial evidence"
        skipped = [d for d, level in coverage.items() if level == "skipped"]
        if skipped:
            line += f"; not explored: {', '.join(skipped)}"
        lines.append(line + ".")
    if uptake["suggested"]:
        line = (
            f"Probes: {uptake['suggested']} suggested — {uptake['asked']} asked, "
            f"{uptake['adapted']} adapted, {uptake['dismissed']} dismissed"
        )
        if uptake_rate is not None:
            line += f" ({int(uptake_rate * 100)}% uptake)"
        lines.append(line + ".")
    else:
        lines.append("No probes were suggested during this interview.")
    if total_questions:
        lines.append(f"Approved question angles asked near-verbatim: {len(matched)} of {total_questions}.")

    return {
        "coverage": coverage,
        "coverage_counts": counts,
        "probe_uptake": {**uptake, "uptake_rate": uptake_rate},
        "probe_uptake_by_dimension": by_dimension,
        "planned_angles": {
            "total": total_questions,
            "asked_near_verbatim": len(matched),
            "matched": matched,
        },
        "summary": " ".join(lines),
    }
