"""Shared prompt-injection sanitisation.

Used by both the live interview prompt assembly and the post-interview
report generation. Both code paths splice candidate-controlled data
(transcript turns, CV-extracted fields) into LLM prompts; without this
sanitiser, a candidate could embed instructions in their utterances or CV
that subvert the report scorer or the live interview agent.

The regex is one layer of defence; callers also wrap untrusted content
in delimited blocks with explicit "treat as data" framing so the model
can recognise the boundary even when an injection marker slips through.

ENG-22 hardening: text is run through `unicodedata.normalize("NFKC", ...)`
and ASCII-folded (casefold) before matching, so Unicode-lookalike bypasses
("ｉｇｎｏｒｅ", "𝐬𝐲𝐬𝐭𝐞𝐦", combining marks, etc.) get folded to their
plain-ASCII equivalents and caught. The output substitutes the matched
span on the *normalised* text — consistent with the rest of the LLM
pipeline, where the candidate's normalised representation is what the
model needs to reason about anyway.
"""
import re
import unicodedata

# Verb stems for "do not follow the system prompt" instructions. Kept
# loose so common synonyms and tense variants land in the net without
# enumerating every conjugation.
_OVERRIDE_VERBS = r"(?:ignore|disregard|forget|override|skip|bypass|drop|reset|clear)"

# Object phrases the candidate would refer to: instructions, prompt, rules,
# system message, etc. The regex is anchored to verb→object pairs so the
# tokens "ignore" and "instructions" alone don't trigger.
_OVERRIDE_OBJECTS = (
    r"(?:all\s+)?(?:the\s+)?"
    r"(?:previous|prior|above|preceding|earlier|original|former)?"
    r"\s*(?:instructions?|prompts?|rules?|system\s+(?:prompt|message)|directives?|guidelines?)"
)

# Pattern groups (separated for readability; concatenated below):
#   - role tags with optional attributes: <system role="x">, </assistant>
#   - LLaMA-style brackets: [INST], [/SYSTEM]
#   - line-start role prefixes: "system:", "assistant:"
#   - markdown role headers: "### system", "## instructions"
#   - verb→object overrides: "ignore previous instructions", "disregard rules"
#   - persona-swap openers: "from now on you are ...", "act as", "new instructions:"
#   - end-of-role markers: "end of system", "end instructions"
_PATTERN_PARTS = [
    r"</?\s*(?:system|instructions?|assistant|user|human|context|developer|operator)\b[^>]*>",
    r"\[/?\s*(?:inst|system|assistant|user|human|developer|operator)\s*\]",
    r"(?:^|\n)\s*(?:system|assistant|human|user|developer|operator)\s*:",
    r"(?:^|\n)\s*#{1,6}\s*(?:system|assistant|user|human|instructions?|prompt|developer)\b",
    _OVERRIDE_VERBS + r"\s+" + _OVERRIDE_OBJECTS,
    r"(?:from\s+now\s+on\s+you\s+(?:are|will|must)|you\s+are\s+now|act\s+as|pretend\s+(?:to\s+be|you('re|\s+are))|new\s+instructions?\s*[:\-])",
    r"(?:^|\n)\s*end\s+(?:of\s+)?(?:system|instructions?|prompt|context)",
]

INJECTION_PATTERNS = re.compile(
    r"(?:" + r"|".join(_PATTERN_PARTS) + r")",
    re.IGNORECASE,
)


def _normalise(text: str) -> str:
    """NFKC normalisation only (no casefold).

    NFKC folds compatibility variants — fullwidth ("ｉｇｎｏｒｅ"),
    mathematical alphanumerics ("𝐢𝐠𝐧𝐨𝐫𝐞"), ligatures ("ﬁ") — to their
    plain-ASCII equivalents, which the pattern set then catches. ASCII
    case is preserved so legitimate prose ("Senior Backend Engineer")
    passes through unchanged; the regex's `re.IGNORECASE` flag handles
    case-folding at match time.
    """
    return unicodedata.normalize("NFKC", text)


def detect_injection_markers(value, max_chars: int = 100_000) -> list[str]:
    """Return the injection-marker spans found in `value`, without mutating it.

    Detection-mode counterpart to `sanitize_untrusted`: same NFKC-first
    normalisation so Unicode-lookalike bypasses are caught, but instead of
    substituting `[filtered]` it reports what matched. Used by the JD-upload
    safety check as the deterministic corroboration signal alongside the
    LLM classifier — and the matched spans double as reviewable evidence
    for the admin security log.
    """
    if value is None:
        return []
    text = _normalise(str(value).strip())[:max_chars]
    return [m.group(0).strip() for m in INJECTION_PATTERNS.finditer(text)]


def sanitize_untrusted(value, max_chars: int) -> str:
    """Length-cap and neutralise obvious prompt-injection markers.

    Applied to candidate-controlled or hirer-controlled data before it is
    spliced into any LLM prompt. Order matters: NFKC first (so Unicode
    bypasses are folded to ASCII), then truncate (so the truncation
    marker `…` stays untouched by NFKC's ellipsis decomposition), then
    pattern-substitute.
    """
    if value is None:
        return ""
    text = str(value).strip()
    text = _normalise(text)
    if len(text) > max_chars:
        text = text[:max_chars].rstrip() + "…"
    return INJECTION_PATTERNS.sub("[filtered]", text)
