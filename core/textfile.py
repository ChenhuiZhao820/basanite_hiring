"""Encoding-tolerant plain-text decoding for uploaded .txt / .md files.

The JD upload endpoint accepts raw text files from hirers, and "a text
file" in the wild is anything from clean UTF-8 to a UTF-16 Notepad
export to a cp1252 document with smart quotes. Rather than throwing a
UnicodeDecodeError at the user, we walk a decode cascade and only give
up when the bytes are genuinely unreadable — and when we do give up,
the error carries a friendly, actionable message.

The same module hosts the post-extraction text normalisation and the
"garbage ratio" guard applied to *every* extraction path (txt/md, PDF,
docx), so a broken font map or a corrupted file produces a kind 422
instead of feeding mojibake into the downstream LLM.
"""
import codecs


class TextDecodeError(Exception):
    """Raised when an uploaded text file cannot be decoded into
    something readable. `.detail` is safe to show to the user."""

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail


_UNREADABLE_DETAIL = (
    "We couldn't read that file's text encoding — it may be corrupted or "
    "saved in an unusual encoding. Try re-saving it as UTF-8, exporting "
    "to PDF, or pasting the text directly."
)

# BOM → codec, checked longest-first so UTF-32 LE isn't mistaken for
# UTF-16 LE (UTF-32 LE's BOM starts with the UTF-16 LE BOM bytes).
_BOMS: tuple[tuple[bytes, str], ...] = (
    (codecs.BOM_UTF32_LE, "utf-32-le"),
    (codecs.BOM_UTF32_BE, "utf-32-be"),
    (codecs.BOM_UTF8, "utf-8-sig"),
    (codecs.BOM_UTF16_LE, "utf-16-le"),
    (codecs.BOM_UTF16_BE, "utf-16-be"),
)

# Above this fraction of U+FFFD replacement characters the last-resort
# decode is judged unreadable and we refuse rather than accept noise.
_MAX_REPLACEMENT_RATIO = 0.05

# Control characters (C0 + C1, minus tab/newline) tolerated in a
# cp1252 decode before we decide the codec guess was wrong.
_MAX_CONTROL_RATIO = 0.01


def _control_ratio(text: str) -> float:
    if not text:
        return 0.0
    controls = sum(
        1
        for ch in text
        if (ord(ch) < 32 and ch not in "\n\r\t") or 127 <= ord(ch) < 160
    )
    return controls / len(text)


def decode_text_file(data: bytes) -> str:
    """Decode uploaded text-file bytes into a normalised string.

    Cascade: BOM sniff → strict UTF-8 → cp1252 (with a control-char
    sanity check) → UTF-8 with replacement (accepted only when the
    replacement ratio is low). Raises TextDecodeError with a
    user-friendly message when nothing yields readable text.
    """
    if not data:
        return ""

    # 1. Explicit BOM wins — Notepad's UTF-16 exports land here.
    for bom, codec in _BOMS:
        if data.startswith(bom):
            payload = data if codec == "utf-8-sig" else data[len(bom):]
            try:
                return normalize_text(payload.decode(codec))
            except UnicodeDecodeError:
                raise TextDecodeError(_UNREADABLE_DETAIL)

    # 2. Strict UTF-8 — the overwhelmingly common case.
    try:
        return normalize_text(data.decode("utf-8"))
    except UnicodeDecodeError:
        pass

    # 3. cp1252 — covers latin-1-ish bytes people actually produce on
    # Windows (smart quotes, accented names). cp1252 can't fail on most
    # byte values, so gate acceptance on the result looking like prose
    # rather than binary noise.
    try:
        text = data.decode("cp1252")
        if _control_ratio(text) <= _MAX_CONTROL_RATIO:
            return normalize_text(text)
    except UnicodeDecodeError:
        pass

    # 4. Last resort: UTF-8 with replacement. A scattering of bad bytes
    # in an otherwise-fine file is salvageable; a wall of U+FFFD means
    # this was never text in a supported encoding.
    text = data.decode("utf-8", errors="replace")
    if text and text.count("\ufffd") / len(text) > _MAX_REPLACEMENT_RATIO:
        raise TextDecodeError(_UNREADABLE_DETAIL)
    return normalize_text(text.replace("\ufffd", ""))


def normalize_text(text: str) -> str:
    """Normalise extracted text regardless of source format.

    - CRLF / CR → LF
    - strip NUL and other C0/C1 control chars (keep \\n and \\t)
    - collapse runs of blank lines to a single blank line
    - trim trailing whitespace per line and surrounding whitespace
    """
    if not text:
        return ""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = "".join(
        ch
        for ch in text
        if ch in "\n\t" or (ord(ch) >= 32 and not 127 <= ord(ch) < 160)
    )
    lines = [line.rstrip() for line in text.split("\n")]
    out: list[str] = []
    blank_run = 0
    for line in lines:
        if line == "":
            blank_run += 1
            if blank_run > 1:
                continue
        else:
            blank_run = 0
        out.append(line)
    return "\n".join(out).strip()


# ─── Garbage-ratio guard for extracted text (all formats) ────────────────

_UNREADABLE_EXTRACTION_DETAIL = (
    "We couldn't extract readable text from that file — it may be a "
    "scan, use unusual fonts, or be corrupted. Try exporting it again, "
    "or paste the text directly."
)

# Extracted text where fewer than this fraction of characters are
# ordinary letters/digits/punctuation/whitespace is treated as mojibake.
_MIN_READABLE_RATIO = 0.70


def looks_like_readable_text(text: str) -> bool:
    """Heuristic sanity check on extraction output (PDF/docx/txt).

    Catches font-map mojibake ("Ȁ̸͝ȅ" walls) that technically decodes
    but is useless downstream. Ordinary letters (any script), digits,
    punctuation, symbols, and whitespace count as readable; unassigned,
    private-use, control, and replacement characters don't.
    """
    if not text:
        return False
    import unicodedata

    readable = 0
    for ch in text:
        if ch in "\n\t ":
            readable += 1
            continue
        cat = unicodedata.category(ch)
        # L* letters, N* numbers, P* punctuation, S* symbols, Zs spaces
        if cat[0] in "LNPS" or cat == "Zs":
            readable += 1
    return readable / len(text) >= _MIN_READABLE_RATIO
