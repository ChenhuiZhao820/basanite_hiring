"""
Render Basanite reports (hirer + candidate) as downloadable PDFs via WeasyPrint.
Both shapes share the same visual language; the hirer variant carries scoring +
evidence, the candidate variant carries constructive feedback.

Also exposes `extract_pdf_text` — a resource-bounded text extractor used
on candidate CV uploads and ATS-side CV fetches. ENG-35 forbade the
unbounded pypdf usage that was vulnerable to compression-bomb DoS.
"""
from html import escape

# ENG-35: max characters the extractor will return. A typical CV is
# 5K–30K characters; 200K is generous headroom. Anything past this is
# either a deliberately-crafted abuse PDF or noise we don't want in a
# downstream LLM context window.
_PDF_TEXT_MAX_CHARS = 200_000

# Per-page cap. A single page that produces this many chars is already
# absurd (> 100 pages of dense text on one PDF page). Stops the abuse
# pattern of "one page that decompresses to gigabytes" from blowing up
# the cumulative-bytes counter before we get to check it.
_PDF_PAGE_MAX_CHARS = 50_000


# Minimum char count below which we treat pypdf's output as a failed
# extraction and try the pdfminer fallback. Many real CVs (LaTeX,
# Pages, InDesign exports) parse to a handful of garbled characters
# under pypdf but extract cleanly under pdfminer.six.
_PDF_PYPDF_MIN_USEFUL_CHARS = 80


def extract_pdf_text(
    data: bytes,
    *,
    max_chars: int = _PDF_TEXT_MAX_CHARS,
    page_max_chars: int = _PDF_PAGE_MAX_CHARS,
) -> str:
    """Stream-extract text from a PDF with hard upper bounds.

    Returns the concatenated, stripped page text, no more than
    ``max_chars`` total. Per-page output is also capped so a single
    pathological page can't dominate. Pages that fail to extract are
    silently skipped (consistent with the previous inline behaviour),
    but extraction stops as soon as the cumulative cap is hit.

    Tries pypdf first (fast, pure-Python, low memory). Falls back to
    pdfminer.six when pypdf raises OR returns implausibly little text,
    because pypdf silently mis-handles a long tail of real-world CVs:
    LaTeX exports with custom font encodings, Pages and InDesign
    PDFs without ToUnicode CMaps, and PDFs whose text stream is
    structured in ways pypdf's layout heuristic can't recover. The
    fallback path keeps the same per-page and total caps.

    The file-size cap is enforced upstream by ``_read_bounded`` /
    multipart limits; this helper is the second line of defence
    against a bomb PDF that compresses small but expands huge.
    """
    pypdf_out, pypdf_err = _extract_with_pypdf(data, max_chars, page_max_chars)
    if pypdf_out and len(pypdf_out) >= _PDF_PYPDF_MIN_USEFUL_CHARS:
        return pypdf_out

    miner_out = _extract_with_pdfminer(data, max_chars, page_max_chars)
    if miner_out and len(miner_out) >= _PDF_PYPDF_MIN_USEFUL_CHARS:
        return miner_out

    # Neither yielded useful text. Prefer the longer of the two so the
    # downstream "too little text, paste instead" path sees the best
    # signal available, rather than empty when pypdf actually got
    # *something*.
    candidates = [c for c in (pypdf_out, miner_out) if c]
    if candidates:
        return max(candidates, key=len)
    if pypdf_err is not None:
        raise pypdf_err
    return ""


def _extract_with_pypdf(
    data: bytes,
    max_chars: int,
    page_max_chars: int,
) -> tuple[str, Exception | None]:
    """Return (text, exception). text is "" if extraction raised."""
    import io
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data))
        parts: list[str] = []
        total = 0
        for page in reader.pages:
            try:
                text = page.extract_text() or ""
            except Exception:
                continue
            if not text:
                continue
            if len(text) > page_max_chars:
                text = text[:page_max_chars]
            parts.append(text)
            total += len(text)
            if total >= max_chars:
                break
        out = "\n\n".join(p.strip() for p in parts if p.strip())
        return out[:max_chars], None
    except Exception as e:
        return "", e


def _extract_with_pdfminer(
    data: bytes,
    max_chars: int,
    page_max_chars: int,
) -> str:
    """pdfminer.six fallback. Returns "" on any failure (incl. missing dep)."""
    import io
    try:
        from pdfminer.high_level import extract_text_to_fp
        from pdfminer.layout import LAParams
    except Exception:
        return ""
    try:
        buf = io.StringIO()
        extract_text_to_fp(
            io.BytesIO(data),
            buf,
            laparams=LAParams(),
            output_type="text",
        )
        text = buf.getvalue() or ""
    except Exception:
        return ""
    # pdfminer hands back the whole document as one string. Split by
    # form-feed (its page separator) so the per-page cap applies, then
    # reapply the total cap the way the pypdf path does.
    parts: list[str] = []
    total = 0
    for raw in text.split("\f"):
        page = raw.strip()
        if not page:
            continue
        if len(page) > page_max_chars:
            page = page[:page_max_chars]
        parts.append(page)
        total += len(page)
        if total >= max_chars:
            break
    return "\n\n".join(parts)[:max_chars]


def _format_key(key: str) -> str:
    """Turn 'technical_depth' into 'Technical Depth' for report headings."""
    if not key:
        return ""
    return " ".join(word.capitalize() for word in str(key).split("_") if word)


BASE_CSS = """
@page { size: A4; margin: 22mm 20mm 20mm 20mm; }
body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
       font-size: 10.5pt; color: #1a1a1a; line-height: 1.55; }
header.doc { border-bottom: 1px solid #e5dccd; padding-bottom: 12px; margin-bottom: 20px;
             display: flex; justify-content: space-between; align-items: baseline; }
header.doc .brand { font-family: 'DM Serif Display', Georgia, serif; font-size: 14pt; color: #0b1f3d; }
header.doc .meta { font-size: 9pt; color: #8a7a5e; text-transform: uppercase; letter-spacing: 0.1em; }
h1 { font-family: 'DM Serif Display', Georgia, serif; font-size: 22pt; color: #0b1f3d;
     margin: 0 0 4px 0; font-weight: normal; }
.sub { color: #555; font-size: 11pt; margin-bottom: 24px; }
h2 { font-family: 'DM Serif Display', Georgia, serif; font-size: 14pt; color: #0b1f3d;
     margin-top: 24px; margin-bottom: 8px; font-weight: normal; border-bottom: 1px solid #eee;
     padding-bottom: 4px; }
h3 { font-size: 11pt; color: #0b1f3d; margin-top: 14px; margin-bottom: 4px; }
p { margin: 0 0 10px 0; }
ul { margin: 0 0 10px 0; padding-left: 18px; }
li { margin-bottom: 4px; }
blockquote { border-left: 3px solid #c49a2f; margin: 8px 0 12px 0; padding: 6px 12px;
             color: #333; background: #faf7f2; font-style: italic; }
.score-row { display: flex; justify-content: space-between; align-items: baseline;
             padding: 8px 0; border-bottom: 1px dashed #eee; }
.score-row:last-child { border-bottom: none; }
.score-name { font-weight: 600; color: #0b1f3d; }
.score-value { font-family: 'Courier New', monospace; font-size: 10pt; color: #c49a2f; }
.quote-basis { color: #555; font-size: 10pt; margin-top: 2px; }
.notes { color: #8a7a5e; font-size: 10pt; margin-top: 2px; font-style: italic; }
footer.doc { margin-top: 28px; padding-top: 10px; border-top: 1px solid #eee;
             color: #8a7a5e; font-size: 8.5pt; }
section.reco { border: 1px solid; padding: 16px 20px; margin: 0 0 24px 0; }
.reco-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.reco-text { flex: 1; }
.reco-eyebrow { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.75;
                margin-bottom: 6px; }
.reco-label { font-family: 'DM Serif Display', Georgia, serif; font-size: 15pt; line-height: 1.2; }
.reco-rationale { font-size: 10pt; margin: 8px 0 0 0; opacity: 0.85; line-height: 1.5; }
.reco-score { text-align: right; min-width: 110px; }
.reco-score-label { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.75; }
.reco-score-value { font-family: 'DM Serif Display', Georgia, serif; font-size: 22pt; line-height: 1.1; }
.reco-score-denom { font-size: 12pt; opacity: 0.6; }
.reco-footnote { font-size: 8.5pt; opacity: 0.7; margin: 10px 0 0 0; }
.spider-wrap { padding: 8px 0 4px 0; }
"""


def _bullets(items: list) -> str:
    if not items:
        return ""
    items = [escape(str(i).strip()) for i in items if str(i).strip()]
    if not items:
        return ""
    return "<ul>" + "".join(f"<li>{i}</li>" for i in items) + "</ul>"


def _header(role_title: str, candidate_name: str, kind: str) -> str:
    return f"""
<header class="doc">
  <span class="brand">Basanite</span>
  <span class="meta">{escape(kind)} report · {escape(candidate_name)} · {escape(role_title)}</span>
</header>
"""


def _footer() -> str:
    return """
<footer class="doc">
  Generated by Basanite, AI conducted technical interviews.
  Scores are grounded in specific candidate quotes. Flag any dimension needing expert verification.
</footer>
"""


def _candidate_html(role_title: str, candidate_name: str, report: dict) -> str:
    summary = escape(report.get("summary") or "")
    strengths = _bullets(report.get("strengths") or [])
    areas = _bullets(report.get("areas_for_development") or [])
    overall = escape(report.get("overall_impression") or "")

    body = []
    if summary:
        body.append(f"<h2>Summary</h2><p>{summary}</p>")
    if strengths:
        body.append(f"<h2>What you did well</h2>{strengths}")
    if areas:
        body.append(f"<h2>Areas for development</h2>{areas}")
    if overall:
        body.append(f"<h2>Overall</h2><blockquote>{overall}</blockquote>")
    if not body:
        body.append("<p>No feedback content available.</p>")

    return f"""
<!doctype html>
<html><head><meta charset="utf-8"><style>{BASE_CSS}</style></head>
<body>
  {_header(role_title, candidate_name, 'Candidate')}
  <h1>Your feedback report</h1>
  <p class="sub">{escape(candidate_name)} · {escape(role_title)}</p>
  {''.join(body)}
  {_footer()}
</body></html>
"""


_TIER_LABELS: dict[str, str] = {
    "strongly_recommended": "Strongly recommended for next round",
    "recommended": "Recommended for next round",
    "can_progress": "Can progress to next round",
    "not_recommended": "Not recommended for next round",
    "strongly_not_recommended": "Strongly not recommended for next round",
}

# Banner accent colours per tier. Kept in the same gold/earth palette
# as the rest of the report but tinted toward red as the tier
# weakens, so a skim-reader can route on colour alone.
_TIER_COLOURS: dict[str, tuple[str, str, str]] = {
    "strongly_recommended": ("#e9f5ec", "#1f7a3a", "#1f7a3a"),
    "recommended": ("#edf6ee", "#3a8a4d", "#3a8a4d"),
    "can_progress": ("#faf3e2", "#8a6a14", "#8a6a14"),
    "not_recommended": ("#fbe9e3", "#8c3c14", "#8c3c14"),
    "strongly_not_recommended": ("#f8dcd6", "#8a2210", "#8a2210"),
}


def _derive_recommendation_pdf(composite: float | None) -> str:
    """Same bands as core.schemas.derive_recommendation; duplicated
    locally so the PDF module stays import-cheap (no pydantic chain)."""
    s = float(composite if composite is not None else 3.0)
    if s >= 4.25:
        return "strongly_recommended"
    if s >= 3.5:
        return "recommended"
    if s >= 2.75:
        return "can_progress"
    if s >= 2.0:
        return "not_recommended"
    return "strongly_not_recommended"


def _recommendation_banner(report: dict) -> str:
    """Top-of-document routing tier. Falls back to a composite-score
    derivation for legacy reports that pre-date the explicit field.

    Returns "" for the truly-empty {} report so the "No report content
    available." fallback path still fires; rendering a banner on an
    empty report would tell the hirer "can progress" with no evidence.
    """
    has_recommendation = bool(str(report.get("recommendation") or "").strip())
    has_composite = isinstance(report.get("composite_score"), (int, float))
    if not has_recommendation and not has_composite:
        return ""
    tier = str(report.get("recommendation") or "").strip()
    if tier not in _TIER_LABELS:
        tier = _derive_recommendation_pdf(report.get("composite_score"))
    bg, accent, label_colour = _TIER_COLOURS[tier]
    label = _TIER_LABELS[tier]
    composite = report.get("composite_score")
    composite_html = ""
    if isinstance(composite, (int, float)):
        composite_html = (
            f'<div class="reco-score">'
            f'<div class="reco-score-label">Composite</div>'
            f'<div class="reco-score-value">{composite:.1f}<span class="reco-score-denom">/5</span></div>'
            f'</div>'
        )
    summary = report.get("comprehensive_assessment") or {}
    rationale_raw = (
        str(report.get("recommendation_rationale") or "").strip()
        or str(summary.get("one_sentence_summary") or "").strip()
    )
    rationale_html = f'<p class="reco-rationale">{escape(rationale_raw)}</p>' if rationale_raw else ""
    return (
        f'<section class="reco" style="background:{bg};border-color:{accent};color:{label_colour};">'
        f'<div class="reco-row">'
        f'<div class="reco-text">'
        f'<div class="reco-eyebrow">Routing recommendation, next round</div>'
        f'<div class="reco-label">{escape(label)}</div>'
        f'{rationale_html}'
        f'</div>'
        f'{composite_html}'
        f'</div>'
        f'<p class="reco-footnote">Routing call only. The hire/no-hire decision sits with the human interviewer.</p>'
        f'</section>'
    )


def _spider_svg(scoring: list[dict]) -> str:
    """Inline SVG radar chart over the scored dimensions. Same maths
    the React `ScoreSpider` uses on the web side so the two render the
    same shape for the same scores. Falls back to empty string when
    there are fewer than three usable rows; the PDF then skips the
    chart section entirely.
    """
    import math

    rows: list[tuple[str, float]] = []
    for s in scoring or []:
        if not isinstance(s, dict):
            continue
        score = s.get("score")
        if not isinstance(score, (int, float)) or score <= 0:
            continue
        dim = str(s.get("dimension") or s.get("name") or "").strip()
        if not dim:
            continue
        rows.append((dim, float(score)))
    if len(rows) < 3:
        return ""

    vb = 480
    center = vb / 2
    r = 168
    label_r_factor = 1.18
    rings = [0.2, 0.4, 0.6, 0.8, 1.0]
    n = len(rows)

    def angle(i: int) -> float:
        return (i / n) * (2 * math.pi) - math.pi / 2

    def point(i: int, frac: float) -> tuple[float, float]:
        a = angle(i)
        return center + math.cos(a) * r * frac, center + math.sin(a) * r * frac

    # 1, 5 → 0, 1 normalised polygon vertices.
    polygon_pts: list[str] = []
    for i, (_dim, score) in enumerate(rows):
        frac = max(0.02, min(1.0, (score - 1) / 4))
        x, y = point(i, frac)
        polygon_pts.append(f"{x:.2f},{y:.2f}")
    polygon = " ".join(polygon_pts)

    ring_circles = "".join(
        f'<circle cx="{center}" cy="{center}" r="{r * ring:.2f}" '
        f'fill="none" stroke="#b3a99e" '
        f'stroke-opacity="{0.55 if ring == 1 else 0.22}" '
        f'stroke-width="{1.25 if ring == 1 else 1}"/>'
        for ring in rings
    )
    axes = "".join(
        f'<line x1="{center}" y1="{center}" x2="{point(i, 1)[0]:.2f}" y2="{point(i, 1)[1]:.2f}" '
        f'stroke="#b3a99e" stroke-opacity="0.3" stroke-width="1"/>'
        for i in range(n)
    )
    dots = ""
    labels = ""
    for i, (dim, score) in enumerate(rows):
        frac = max(0.02, min(1.0, (score - 1) / 4))
        dx, dy = point(i, frac)
        dots += f'<circle cx="{dx:.2f}" cy="{dy:.2f}" r="4" fill="#c49a2f"/>'
        lx, ly = point(i, label_r_factor)
        a = angle(i)
        cos_a, sin_a = math.cos(a), math.sin(a)
        anchor = "start" if cos_a > 0.35 else "end" if cos_a < -0.35 else "middle"
        baseline = "auto" if sin_a < -0.35 else "hanging" if sin_a > 0.35 else "middle"
        labels += (
            f'<text x="{lx:.2f}" y="{ly:.2f}" text-anchor="{anchor}" '
            f'dominant-baseline="{baseline}" font-size="13" fill="#3d3a36">'
            f'{escape(_format_key(dim))}</text>'
        )

    return (
        f'<svg viewBox="0 0 {vb} {vb}" preserveAspectRatio="xMidYMid meet" '
        f'overflow="visible" width="420" height="420" '
        f'style="display:block;margin:0 auto;">'
        f'{ring_circles}{axes}'
        f'<polygon points="{polygon}" fill="#c49a2f" fill-opacity="0.22" '
        f'stroke="#c49a2f" stroke-opacity="0.9" stroke-width="1.5" stroke-linejoin="round"/>'
        f'{dots}{labels}'
        f'</svg>'
    )


def _hirer_html(role_title: str, candidate_name: str, report: dict) -> str:
    body: list[str] = []

    # 1. Top-level routing recommendation banner. Skipped on the truly
    #    empty `{}` report so the "no content" fallback at the bottom
    #    still fires.
    banner = _recommendation_banner(report)
    if banner:
        body.append(banner)

    summary = report.get("comprehensive_assessment") or {}
    one_liner = escape(summary.get("one_sentence_summary") or "")

    scoring = report.get("scoring_summary") or []

    # 2. Dimension profile chart, only when there are >= 3 scored rows.
    spider = _spider_svg(scoring)
    if spider:
        body.append(f'<h2>Dimension profile</h2><div class="spider-wrap">{spider}</div>')

    if one_liner:
        body.append(f"<blockquote>{one_liner}</blockquote>")
    if scoring:
        rows = []
        for s in scoring:
            raw_name = s.get("dimension") or s.get("name") or ""
            name = escape(_format_key(raw_name))
            score = s.get("score")
            score_str = f"{score}/5" if isinstance(score, (int, float)) else escape(str(score or ""))
            quote = escape(str(s.get("quotation_basis") or ""))
            notes = escape(str(s.get("notes") or ""))
            quote_html = f'<div class="quote-basis">&ldquo;{quote}&rdquo;</div>' if quote else ""
            notes_html = f'<div class="notes">{notes}</div>' if notes else ""
            rows.append(
                f'<div class="score-row">'
                f'<div><div class="score-name">{name}</div>{quote_html}{notes_html}</div>'
                f'<div class="score-value">{score_str}</div>'
                f'</div>'
            )
        body.append("<h2>Dimension scores</h2>" + "".join(rows))

    excerpts = report.get("top_excerpts") or []
    if excerpts:
        items = []
        for e in excerpts:
            if isinstance(e, dict):
                quote = escape(str(e.get("quote") or e.get("excerpt") or ""))
                why = escape(str(e.get("why") or e.get("reason") or e.get("why_selected") or ""))
                why_html = f"<p>{why}</p>" if why else ""
                items.append(f"<blockquote>{quote}</blockquote>{why_html}")
            else:
                items.append(f"<blockquote>{escape(str(e))}</blockquote>")
        body.append("<h2>Top excerpts</h2>" + "".join(items))

    cap = report.get("capability_map") or {}
    if cap:
        sections = [
            ("Technical depth", cap.get("technical_depth")),
            ("Transfer capability", cap.get("transfer_capability")),
            ("Blind spots", cap.get("blind_spots")),
            ("Requires expert verification", cap.get("expert_verification_nodes")),
        ]
        parts = []
        for title, value in sections:
            if not value:
                continue
            if isinstance(value, list):
                parts.append(f"<h3>{escape(title)}</h3>{_bullets(value)}")
            else:
                parts.append(f"<h3>{escape(title)}</h3><p>{escape(str(value))}</p>")
        if parts:
            body.append("<h2>Capability map</h2>" + "".join(parts))

    risk = summary.get("cheating_risk") if isinstance(summary, dict) else None
    if risk:
        if isinstance(risk, dict):
            level = escape(str(risk.get("level") or ""))
            rationale = escape(str(risk.get("rationale") or ""))
            body.append(f"<h2>Cheating risk</h2><p><strong>{level}</strong>, {rationale}</p>")
        else:
            body.append(f"<h2>Cheating risk</h2><p>{escape(str(risk))}</p>")

    if not body:
        body.append("<p>No report content available.</p>")

    return f"""
<!doctype html>
<html><head><meta charset="utf-8"><style>{BASE_CSS}</style></head>
<body>
  {_header(role_title, candidate_name, 'Hirer')}
  <h1>Assessment report</h1>
  <p class="sub">{escape(candidate_name)} · {escape(role_title)}</p>
  {''.join(body)}
  {_footer()}
</body></html>
"""


def render_report_pdf(
    report_type: str,
    role_title: str,
    candidate_name: str,
    report: dict,
) -> bytes:
    """Return a PDF byte-string for the given report. report_type is 'hirer' or 'candidate'."""
    from weasyprint import HTML
    html = (
        _hirer_html(role_title, candidate_name, report)
        if report_type == "hirer"
        else _candidate_html(role_title, candidate_name, report)
    )
    return HTML(string=html).write_pdf()
