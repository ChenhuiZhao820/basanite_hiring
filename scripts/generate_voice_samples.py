"""
Generate the static MP3 preview clips used by the voice picker.

Run this ONCE locally (it needs ELEVENLABS_API_KEY in your env) whenever
the catalogue in core/voices.py changes. The output MP3s are committed
to the repo under web/public/voices/{voice_id}.mp3 so the live site
serves them as static assets — no per-click ElevenLabs API charge.

Usage:
    cd /path/to/Basanite
    source .venv/bin/activate
    python scripts/generate_voice_samples.py

Costs: ~0.05 USD total for all 8 voices. Runs in ~30 seconds.
"""

from __future__ import annotations

import os
import sys
import urllib.request
import urllib.error
import json
from pathlib import Path

# Make `core.voices` importable when run as a script from repo root.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.voices import VOICES  # noqa: E402

# The same line each voice reads. Fixed copy across all voices keeps the
# preview comparison fair — listening for tone/accent, not different words.
PREVIEW_TEXT = (
    "Hi, I'm Baz. I'll be conducting your interview today. "
    "Let me know if you can hear me clearly."
)

OUTPUT_DIR = Path(__file__).resolve().parents[1] / "web" / "public" / "voices"

# Use eleven_turbo_v2_5 — same model the live agent uses, so the preview
# matches what the candidate will actually hear.
MODEL_ID = "eleven_turbo_v2_5"


def synth(api_key: str, voice_id: str) -> bytes:
    """Call ElevenLabs TTS for one voice. Returns MP3 bytes."""
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    body = json.dumps({
        "text": PREVIEW_TEXT,
        "model_id": MODEL_ID,
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
        },
    }).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read()
    except urllib.error.HTTPError as e:
        sys.stderr.write(f"  HTTP {e.code} for {voice_id}: {e.read().decode('utf-8', 'replace')[:200]}\n")
        raise


def main() -> int:
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        sys.stderr.write("ELEVENLABS_API_KEY not set in env\n")
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Generating {len(VOICES)} preview clips → {OUTPUT_DIR}")
    for v in VOICES:
        target = OUTPUT_DIR / f"{v.id}.mp3"
        if target.exists():
            print(f"  - {v.name} ({v.id}): already exists, skipping")
            continue
        print(f"  - {v.name} ({v.id}): synthesising…", flush=True)
        try:
            audio = synth(api_key, v.id)
        except Exception as e:
            sys.stderr.write(f"    failed: {e}\n")
            return 2
        target.write_bytes(audio)
        size_kb = len(audio) // 1024
        print(f"    wrote {target.name} ({size_kb} KB)")

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
