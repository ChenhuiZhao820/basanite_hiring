"""Shared prompt-injection sanitisation.

Used by both the live interview prompt assembly and the post-interview
report generation. Both code paths splice candidate-controlled data
(transcript turns, CV-extracted fields) into LLM prompts; without this
sanitiser, a candidate could embed instructions in their utterances or CV
that subvert the report scorer or the live interview agent.

This regex catches common injection markers but is fundamentally bypassable
(tracked separately as ENG-22). It is one layer of defence; callers must
also wrap untrusted content in delimited blocks with explicit "treat as
data" framing so the model can recognise the boundary.
"""
import re

INJECTION_PATTERNS = re.compile(
    r"(?:"
    r"</?\s*(?:system|instructions?|assistant|user|human|context)\s*>"
    r"|\[/?\s*(?:INST|SYSTEM|ASSISTANT|USER)\s*\]"
    r"|(?:^|\n)\s*(?:system|assistant|human|user)\s*:"
    r"|(?:^|\n)\s*###\s*(?:system|assistant|user|instructions?)\b"
    r"|ignore (?:all )?(?:previous|prior|above) instructions"
    r")",
    re.IGNORECASE,
)


def sanitize_untrusted(value, max_chars: int) -> str:
    """Length-cap and neutralise obvious prompt-injection markers.

    Applied to candidate-controlled or hirer-controlled data before it is
    spliced into any LLM prompt.
    """
    if value is None:
        return ""
    text = str(value).strip()
    if len(text) > max_chars:
        text = text[:max_chars].rstrip() + "…"
    return INJECTION_PATTERNS.sub("[filtered]", text)
