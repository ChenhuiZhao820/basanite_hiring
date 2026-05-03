"""
Curated catalogue of interviewer voices.

These are the voices a hiring manager can pick from when creating or
editing a role; the chosen voice's ID is persisted on roles.interviewer_voice_id
and threaded through to the live ElevenLabs session via overrides.tts.voiceId.

All entries use ElevenLabs' default library voices — no custom-voice
provisioning is required. To add or remove a voice:
    1. Update VOICES below.
    2. Run scripts/generate_voice_samples.py to produce the matching MP3
       preview, commit it under web/public/voices/.
    3. Mirror the change in web/lib/voices.ts (frontend uses the same
       shape; we don't fetch the catalogue at runtime to avoid an extra
       roundtrip on dashboard render).
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Voice:
    id: str          # ElevenLabs voice ID — must match the SDK's expected format
    name: str        # Display name shown in the picker
    accent: str      # 'British' | 'American' (for the badge)
    gender: str      # 'Female' | 'Male' (for the chip)
    description: str # 1-line tone description, e.g. "warm narration"


# IDs sourced from the ElevenLabs default library. If a voice ID stops
# working (rare — ElevenLabs occasionally retires voices), the picker
# silently falls back to "no override" for any role pinned to it; the
# interview still runs with the agent's default voice.
VOICES: tuple[Voice, ...] = (
    # ─── British female ──────────────────────────────────────────
    Voice(id="pFZP5JQG7iQjIQuC4Bku", name="Lily",    accent="British",  gender="Female", description="Warm narration"),
    Voice(id="Xb7hH8MSUJpSbSDYk0k2", name="Alice",   accent="British",  gender="Female", description="Confident, clear"),
    Voice(id="ThT5KcBeYPX3keUQqHPh", name="Dorothy", accent="British",  gender="Female", description="Pleasant, articulate"),
    # ─── British male ────────────────────────────────────────────
    Voice(id="JBFqnCBsd6RMkjVDRZzb", name="George",  accent="British",  gender="Male",   description="Warm narration"),
    Voice(id="onwK4e9ZLuTAKqWW03F9", name="Daniel",  accent="British",  gender="Male",   description="Authoritative"),
    Voice(id="Zlb1dXrM653N07WRdFW3", name="Joseph",  accent="British",  gender="Male",   description="Articulate"),
    # ─── American ────────────────────────────────────────────────
    Voice(id="EXAVITQu4vr4xnSDxMaL", name="Sarah",   accent="American", gender="Female", description="Soft conversational"),
    Voice(id="pNInz6obpgDQGcFmaJgB", name="Adam",    accent="American", gender="Male",   description="Deep narration"),
)


# Set form for O(1) validation of incoming role updates.
ALLOWED_VOICE_IDS: frozenset[str] = frozenset(v.id for v in VOICES)


def is_valid_voice(voice_id: str | None) -> bool:
    """True if voice_id is one of the catalogue entries. None counts as
    valid because it means 'use the agent default'."""
    if voice_id is None:
        return True
    return voice_id in ALLOWED_VOICE_IDS


def to_dict(v: Voice) -> dict:
    return {
        "id": v.id,
        "name": v.name,
        "accent": v.accent,
        "gender": v.gender,
        "description": v.description,
        "sample_url": f"/voices/{v.id}.mp3",
    }


def catalogue() -> list[dict]:
    """JSON-serialisable shape returned by GET /voices."""
    return [to_dict(v) for v in VOICES]
