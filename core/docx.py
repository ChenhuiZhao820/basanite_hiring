"""Bounded text extraction from .docx files (stdlib only).

A .docx is a zip archive whose main body lives in `word/document.xml`;
paragraph text is the concatenation of `w:t` runs. We deliberately do
NOT pull in python-docx — for JD extraction we only need body text,
and the stdlib route avoids a new dependency (and lxml's platform
quirks) while making the resource bounds explicit.

Same defensive philosophy as core/pdf.extract_pdf_text (ENG-35): the
upload size cap upstream is the first line of defence; this module
additionally refuses zip entries whose *declared uncompressed* size is
absurd, so a zip-bomb .docx can't balloon in memory, and caps the
extracted character count.
"""
import io
import zipfile
import xml.etree.ElementTree as ET

# Word's main namespace. Hardcoded (rather than parsed from the doc) —
# it has been stable across every OOXML version and sniffing it from
# attacker-controlled XML buys nothing.
_W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

# A JD document.xml is typically tens of KB. 20 MB uncompressed is
# generous headroom for legitimate heavily-styled documents while
# refusing "40 KB zip that inflates to 4 GB" bombs.
_MAX_DOCUMENT_XML_BYTES = 20 * 1024 * 1024

# Output char cap — matches the ceiling used by core/pdf.py.
_DOCX_TEXT_MAX_CHARS = 200_000


class DocxExtractError(Exception):
    """Raised when the archive isn't a readable .docx. `.detail` is
    safe to show to the user."""

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail


def is_docx(data: bytes) -> bool:
    """Cheap containment check: zip magic + a word/document.xml entry.

    Distinguishes a real Word document from other OOXML/zip files
    (xlsx, pptx, plain .zip) without decompressing anything.
    """
    if not data.startswith(b"PK\x03\x04"):
        return False
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            return "word/document.xml" in zf.namelist()
    except Exception:
        return False


def extract_docx_text(data: bytes, *, max_chars: int = _DOCX_TEXT_MAX_CHARS) -> str:
    """Extract paragraph text from .docx bytes, bounded.

    Paragraphs are joined with newlines; runs within a paragraph are
    concatenated; explicit line/tab breaks (w:br, w:tab) become their
    text equivalents. Raises DocxExtractError on anything that isn't a
    readable Word document.
    """
    try:
        zf = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        raise DocxExtractError("That file doesn't look like a valid Word document.")

    try:
        info = zf.getinfo("word/document.xml")
    except KeyError:
        raise DocxExtractError(
            "That file doesn't contain a Word document body — it may be a "
            "different Office format. Please upload a .docx, PDF, .txt or .md file."
        )

    # Bomb guard: the zip header declares the uncompressed size; refuse
    # before decompressing rather than after the memory is spent. A lying
    # header is caught by the bounded read below.
    if info.file_size > _MAX_DOCUMENT_XML_BYTES:
        raise DocxExtractError("That Word document is too large to process.")

    with zf.open(info) as fh:
        xml_bytes = fh.read(_MAX_DOCUMENT_XML_BYTES + 1)
    if len(xml_bytes) > _MAX_DOCUMENT_XML_BYTES:
        raise DocxExtractError("That Word document is too large to process.")

    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        raise DocxExtractError("We couldn't read that Word document — it may be corrupted.")

    paragraphs: list[str] = []
    total = 0
    for para in root.iter(f"{_W_NS}p"):
        parts: list[str] = []
        for node in para.iter():
            tag = node.tag
            if tag == f"{_W_NS}t":
                parts.append(node.text or "")
            elif tag == f"{_W_NS}br" or tag == f"{_W_NS}cr":
                parts.append("\n")
            elif tag == f"{_W_NS}tab":
                parts.append("\t")
        text = "".join(parts)
        paragraphs.append(text)
        total += len(text) + 1
        if total >= max_chars:
            break

    return "\n".join(paragraphs)[:max_chars].strip()
