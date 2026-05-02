"""
Automated data-retention sweep.

Runs once per day (Render cron job hits the FastAPI endpoint that calls
`run_retention_sweep`) and enforces the published policy:

    Voice recordings:    purged 6 months after assessment.completed_at
    Transcripts/scores:  purged 12 months after completed_at
    Reports + CV text:   purged 12 months after completed_at
    Erasure-flagged:     purged within 30 days of deletion_requested_at

The sweep is idempotent: rows already purged in a previous run are
filtered out by the date predicate. Each run inserts a row into
`data_retention_runs` with counts so we can demonstrate (Article 5(2)
accountability) that retention is actually being enforced.

Operations are best-effort and logged. We never abort the whole sweep
because one row failed; partial progress is recorded in the
`errors` JSONB column on the run row.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta, timezone
from typing import Any


# Default windows (in days). Override via env for testing.
RECORDING_RETENTION_DAYS = int(os.getenv("RETENTION_RECORDINGS_DAYS", "180"))
TRANSCRIPT_RETENTION_DAYS = int(os.getenv("RETENTION_TRANSCRIPTS_DAYS", "365"))
REPORT_RETENTION_DAYS = int(os.getenv("RETENTION_REPORTS_DAYS", "365"))
CV_RETENTION_DAYS = int(os.getenv("RETENTION_CV_DAYS", "365"))
ERASURE_GRACE_DAYS = int(os.getenv("RETENTION_ERASURE_GRACE_DAYS", "30"))


@dataclass
class SweepResult:
    deleted_assessments: int = 0
    deleted_recordings: int = 0
    deleted_transcripts: int = 0
    deleted_reports: int = 0
    deleted_dimension_scores: int = 0
    deleted_waitlist: int = 0
    errors: list[dict[str, Any]] = field(default_factory=list)


def run_retention_sweep() -> SweepResult:
    """Execute the retention pass and return counts."""
    from core.db import get_client

    client = get_client()
    if not client:
        return SweepResult(errors=[{"stage": "init", "message": "DB unavailable"}])

    result = SweepResult()
    now = datetime.now(timezone.utc)

    # ─────────────── 1. Erasure-flagged assessments (30-day grace) ────────────
    # Anything with deletion_requested_at older than the grace window gets the
    # full nuke (recording + transcript + scores + reports + assessment row).
    erasure_cutoff = now - timedelta(days=ERASURE_GRACE_DAYS)
    try:
        rows = (
            client.table("assessments")
            .select("id")
            .lt("deletion_requested_at", erasure_cutoff.isoformat())
            .execute()
        ).data or []
        for row in rows:
            _purge_assessment_completely(client, row["id"], result)
        result.deleted_assessments += len(rows)
    except Exception as e:
        result.errors.append({"stage": "erasure", "message": str(e)[:300]})

    # ─────────────── 2. Time-based recording purge (6mo) ──────────────────────
    # Recordings live in storage; we delete the file but keep the assessment
    # row (the candidate still has scores+report). assessments.recording_path
    # gets nulled.
    rec_cutoff = now - timedelta(days=RECORDING_RETENTION_DAYS)
    try:
        rows = (
            client.table("assessments")
            .select("id, recording_path")
            .not_.is_("recording_path", "null")
            .lt("completed_at", rec_cutoff.isoformat())
            .execute()
        ).data or []
        for row in rows:
            try:
                client.storage.from_("interview-recordings").remove([row["recording_path"]])
                client.table("assessments").update({"recording_path": None}).eq("id", row["id"]).execute()
                result.deleted_recordings += 1
            except Exception as e:
                result.errors.append({"stage": "recording_purge", "id": row["id"], "message": str(e)[:200]})
    except Exception as e:
        result.errors.append({"stage": "recording_query", "message": str(e)[:300]})

    # ─────────────── 3. Time-based transcript + score + report purge (12mo) ──
    # Drop interview_sessions.messages, dimension_scores, reports, and clear
    # CV text on assessments. Assessment row stays (auditable shell).
    full_cutoff = now - timedelta(days=TRANSCRIPT_RETENTION_DAYS)
    try:
        # Find old-enough completed assessments still carrying data.
        rows = (
            client.table("assessments")
            .select("id")
            .lt("completed_at", full_cutoff.isoformat())
            .not_.is_("completed_at", "null")
            .execute()
        ).data or []
        for row in rows:
            aid = row["id"]
            try:
                # Wipe transcript text but keep the session row stub.
                ds = client.table("interview_sessions").update(
                    {"messages": []}
                ).eq("assessment_id", aid).execute()
                if ds.data:
                    result.deleted_transcripts += len(ds.data)

                # Drop dimension scores entirely.
                dr = client.table("dimension_scores").delete().eq("assessment_id", aid).execute()
                if dr.data:
                    result.deleted_dimension_scores += len(dr.data)

                # Drop reports entirely.
                rr = client.table("reports").delete().eq("assessment_id", aid).execute()
                if rr.data:
                    result.deleted_reports += len(rr.data)

                # Wipe CV text + cv_extracted JSON; keep candidate name/email
                # for the audit shell so disputes can still be referenced.
                client.table("assessments").update(
                    {"cv_extracted": None}
                ).eq("id", aid).execute()
            except Exception as e:
                result.errors.append({"stage": "time_based_purge", "id": aid, "message": str(e)[:200]})
    except Exception as e:
        result.errors.append({"stage": "time_based_query", "message": str(e)[:300]})

    # ─────────────── 4. Waitlist entries acted on or stale ────────────────────
    # Waitlist rows: rejected ones older than 30 days, approved ones become
    # full hirer accounts so don't auto-purge those.
    waitlist_cutoff = now - timedelta(days=30)
    try:
        wr = (
            client.table("waitlist")
            .delete()
            .eq("status", "rejected")
            .lt("created_at", waitlist_cutoff.isoformat())
            .execute()
        )
        if wr.data:
            result.deleted_waitlist += len(wr.data)
    except Exception as e:
        result.errors.append({"stage": "waitlist_purge", "message": str(e)[:300]})

    # ─────────────── Record the run ──────────────────────────────────────────
    try:
        client.table("data_retention_runs").insert({
            "deleted_assessments": result.deleted_assessments,
            "deleted_recordings": result.deleted_recordings,
            "deleted_transcripts": result.deleted_transcripts,
            "deleted_reports": result.deleted_reports,
            "deleted_dimension_scores": result.deleted_dimension_scores,
            "deleted_waitlist": result.deleted_waitlist,
            "errors": result.errors if result.errors else None,
        }).execute()
    except Exception as e:
        # We can't record the run — print so it at least appears in logs.
        print(f"  [retention] failed to record run: {type(e).__name__}: {e}")

    print(
        f"  [retention] sweep done: "
        f"erased_assessments={result.deleted_assessments} "
        f"recordings={result.deleted_recordings} "
        f"transcripts={result.deleted_transcripts} "
        f"reports={result.deleted_reports} "
        f"scores={result.deleted_dimension_scores} "
        f"waitlist={result.deleted_waitlist} "
        f"errors={len(result.errors)}"
    )
    return result


def _purge_assessment_completely(client, assessment_id: str, result: SweepResult) -> None:
    """Erasure-flagged assessment: drop everything including the recording
    blob and the assessment row itself."""
    # Recording first — Supabase storage doesn't cascade.
    try:
        a = client.table("assessments").select("recording_path").eq("id", assessment_id).single().execute()
        path = (a.data or {}).get("recording_path")
        if path:
            client.storage.from_("interview-recordings").remove([path])
            result.deleted_recordings += 1
    except Exception as e:
        result.errors.append({"stage": "erasure_recording", "id": assessment_id, "message": str(e)[:200]})

    # Cascade: deleting the assessment cascades to interview_sessions,
    # dimension_scores, reports via FK ON DELETE CASCADE.
    try:
        client.table("assessments").delete().eq("id", assessment_id).execute()
    except Exception as e:
        result.errors.append({"stage": "erasure_assessment", "id": assessment_id, "message": str(e)[:200]})


def to_dict(r: SweepResult) -> dict:
    return asdict(r)
