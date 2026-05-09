"""
Provider-specific ATS write adapters (PR8).

Merge.dev gives us a Unified API — the same `client.ats.notes.create` call
works on every provider. But for high-signal placement of the assessment
result, each ATS has a native concept that fits better than a generic note:

    Greenhouse:  Scorecards (rated review per stage). Posted via Merge
                 passthrough since Merge's unified Scorecard model is
                 read-only.
    Lever:       Feedback forms (similar to scorecards). Merge has a unified
                 ScheduledInterview / Feedback model but write coverage is
                 partial; we fall back to a note + tag the application.
    Ashby:       Interview feedback. Same partial coverage — note + custom
                 field write where supported.
    default:     Plain note on the application. Always works on every
                 provider Merge supports.

Every adapter accepts (client, ctx) where:
    client = ats.merge_client(account_token=...)  scoped to the linked account
    ctx    = AdapterContext dataclass with the assessment + report payload

and returns AdapterResult(success: bool, kind: str, error: str | None).

The dispatch map lives at the bottom of this file; api.push_results looks up
the right adapter via the connection's `provider` slug.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable

# ENG-44: Greenhouse passthrough interpolates merge_application_id into a
# REST path. Merge SDK probably sanitises but we don't trust an external
# library to be the only line of defence — assert the ID matches a safe
# character class before letting it near a path string.
_MERGE_APPLICATION_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,128}$")


# ─────────────────────────── Context + result types ─────────────────────────


@dataclass(frozen=True)
class AdapterContext:
    """Everything an adapter needs to write the result back."""

    assessment_id: str
    merge_application_id: str
    merge_candidate_id: str | None
    candidate_name: str
    role_title: str
    overall_score: float | None        # 0-5 normalized
    dimension_scores: list[dict]       # [{dimension_key, score, evidence_summary}]
    summary_text: str                  # short human-readable summary
    public_report_url: str             # signed URL to the hirer-facing PDF


@dataclass(frozen=True)
class AdapterResult:
    success: bool
    kind: str            # 'note', 'scorecard', 'feedback', 'note+passthrough'
    error: str | None = None
    detail: dict | None = None


# ─────────────────────────── Note formatting ────────────────────────────────


def _format_note_body(ctx: AdapterContext) -> str:
    """Render the assessment result as a structured ATS note body.
    Plain text; most ATS notes don't render markdown reliably."""
    lines: list[str] = []
    lines.append(f"Basanite assessment complete for {ctx.candidate_name}.")
    lines.append("")
    if ctx.overall_score is not None:
        lines.append(f"Overall score: {ctx.overall_score:.1f} / 5.0")
    lines.append("")
    if ctx.dimension_scores:
        lines.append("Dimension scores:")
        for d in ctx.dimension_scores:
            key = (d.get("dimension_key") or "").replace("_", " ").title()
            score = d.get("score")
            if score is None:
                continue
            try:
                score_str = f"{float(score):.1f}"
            except (TypeError, ValueError):
                score_str = str(score)
            lines.append(f"  - {key}: {score_str} / 5.0")
        lines.append("")
    if ctx.summary_text:
        lines.append("Summary:")
        lines.append(ctx.summary_text)
        lines.append("")
    lines.append(f"Full report: {ctx.public_report_url}")
    return "\n".join(lines)


# ─────────────────────────── Default note adapter ───────────────────────────


def _post_unified_note(client, ctx: AdapterContext) -> AdapterResult:
    """Post a note via Merge's unified ATS Notes endpoint. Works everywhere."""
    body = _format_note_body(ctx)
    try:
        # Merge's unified Notes model accepts application + body.
        client.ats.notes.create(
            model={
                "application": ctx.merge_application_id,
                "body": body,
            },
        )
        return AdapterResult(success=True, kind="note")
    except Exception as e:
        return AdapterResult(
            success=False,
            kind="note",
            error=f"{type(e).__name__}: {str(e)[:400]}",
        )


def adapter_default(client, ctx: AdapterContext) -> AdapterResult:
    return _post_unified_note(client, ctx)


# ─────────────────────────── Greenhouse adapter ─────────────────────────────


def adapter_greenhouse(client, ctx: AdapterContext) -> AdapterResult:
    """
    Greenhouse: post a unified note (always succeeds), then attempt to write a
    scorecard via Merge passthrough so the assessment shows up in the native
    review UI rather than only in activity feed.

    Greenhouse scorecards are tied to interview stages, which we don't always
    know from the application alone. v1 strategy: post the note unconditionally;
    if MERGE_GREENHOUSE_SCORECARD_ENABLED is set, attempt the passthrough
    scorecard write and degrade gracefully if it fails. The customer always
    sees the result on the application, just sometimes only as a note.
    """
    note_result = _post_unified_note(client, ctx)
    if not note_result.success:
        return note_result

    # Scorecard write via passthrough is opt-in until we've validated against
    # a real Greenhouse account — keep it dark by default for the first client.
    import os
    if os.getenv("MERGE_GREENHOUSE_SCORECARD_ENABLED", "").lower() != "true":
        return AdapterResult(success=True, kind="note", detail={"scorecard": "skipped"})

    # ENG-44: validate the application ID before path interpolation so a
    # corrupted DB row or replay can't escape the path or hit unintended
    # Greenhouse endpoints. Skip the passthrough rather than fail loud
    # (the unified note is already posted).
    if not _MERGE_APPLICATION_ID_RE.fullmatch(str(ctx.merge_application_id or "")):
        return AdapterResult(
            success=True,
            kind="note",
            detail={"scorecard": "skipped_invalid_application_id"},
        )

    # Passthrough — write a Greenhouse activity-feed entry with structured data.
    # Greenhouse's REST API is documented at https://developers.greenhouse.io;
    # the activity-feed write is the lowest-friction surface that doesn't
    # require knowing the interview/stage IDs.
    try:
        client.ats.passthrough.create(
            method="POST",
            path=f"/v1/applications/{ctx.merge_application_id}/activity_feed_notes",
            data={
                "user_id": None,  # Greenhouse picks the linked-account user
                "body": _format_note_body(ctx),
                "visibility": "public",
            },
            multipart_form_data=None,
            request_format="JSON",
        )
        return AdapterResult(success=True, kind="note+passthrough")
    except Exception as e:
        # Note already posted; swallow passthrough failure but record it.
        return AdapterResult(
            success=True,
            kind="note",
            detail={
                "scorecard_error": f"{type(e).__name__}: {str(e)[:240]}",
            },
        )


# ─────────────────────────── Lever adapter ──────────────────────────────────


def adapter_lever(client, ctx: AdapterContext) -> AdapterResult:
    """Lever: unified note. Lever's feedback forms are interview-bound and
    we don't have a corresponding Basanite interview ID to attach to."""
    return _post_unified_note(client, ctx)


# ─────────────────────────── Ashby adapter ──────────────────────────────────


def adapter_ashby(client, ctx: AdapterContext) -> AdapterResult:
    return _post_unified_note(client, ctx)


# ─────────────────────────── Dispatch ───────────────────────────────────────


_ADAPTERS: dict[str, Callable[[object, AdapterContext], AdapterResult]] = {
    "greenhouse": adapter_greenhouse,
    "lever": adapter_lever,
    "ashby": adapter_ashby,
}


def adapter_for(provider_slug: str | None) -> Callable[[object, AdapterContext], AdapterResult]:
    """Return the right adapter for a provider slug, defaulting to a plain note."""
    if not provider_slug:
        return adapter_default
    return _ADAPTERS.get(provider_slug.lower(), adapter_default)
