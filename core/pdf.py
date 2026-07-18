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
       font-size: 10.5pt; color: #2a2a2a; line-height: 1.55; }

/* ── Header / brand line ────────────────────────────────────────── */
header.doc { border-bottom: 1px solid #d5cfc0; padding-bottom: 10px; margin-bottom: 22px;
             display: flex; justify-content: flex-start; align-items: baseline; gap: 14px; }
header.doc .brand { font-family: 'DM Serif Display', Georgia, serif; font-size: 15pt;
                    color: #1a4045; letter-spacing: 0.01em; }
header.doc .meta { font-size: 8.5pt; color: #6f6355; text-transform: uppercase;
                   letter-spacing: 0.14em; }

/* ── Titles ────────────────────────────────────────────────────── */
h1 { font-family: 'DM Serif Display', Georgia, serif; font-size: 26pt; color: #1a4045;
     margin: 0 0 4px 0; font-weight: normal; letter-spacing: -0.005em; }
.sub { color: #6a6a6a; font-size: 10.5pt; margin: 0 0 20px 0; }
h2 { font-family: 'DM Serif Display', Georgia, serif; font-size: 16pt; color: #1a4045;
     margin: 28px 0 12px 0; font-weight: normal;
     border-bottom: 1px solid #d5cfc0; padding-bottom: 6px; }
h3 { font-size: 10.5pt; color: #1a4045; margin: 16px 0 6px 0; font-weight: 700; }
p { margin: 0 0 10px 0; }
ul { margin: 6px 0 10px 0; padding-left: 18px; }
li { margin-bottom: 6px; color: #333; }

/* ── Executive summary callout ─────────────────────────────────── */
.exec-callout { background: #f4efe0; border-left: 4px solid #a08a30;
                padding: 14px 18px; margin: 0 0 22px 0;
                color: #333; font-size: 10.5pt; line-height: 1.6; }

/* ── Recommendation 3-card strip ───────────────────────────────── */
.reco-cards { display: flex; gap: 12px; margin: 0 0 20px 0; }
.reco-card { flex: 1 1 0; border: 1px solid #e5dccd; padding: 18px 12px;
             text-align: center; background: #fbfaf6; position: relative; }
.reco-card .dot { width: 8px; height: 8px; border-radius: 50%;
                  margin: 0 auto 10px auto; background: #b7c7a8; }
.reco-card.dot-green .dot { background: #6a9a4a; }
.reco-card.dot-red .dot { background: #c04a3c; }
.reco-card .eyebrow { font-size: 8pt; letter-spacing: 0.14em; color: #6f6355;
                      text-transform: uppercase; margin-bottom: 6px; }
.reco-card .tier-label { font-family: 'DM Serif Display', Georgia, serif; font-size: 12.5pt;
                         line-height: 1.3; color: #6a6a6a; }
.reco-card.active { background: #fdf3ef; border: 1.5px solid #c04a3c; }
.reco-card.active.tier-green { background: #f1f7ec; border-color: #6a9a4a; }
.reco-card.active .tier-label { color: #1a4045; }
.reco-card .active-marker { font-size: 8pt; letter-spacing: 0.14em; color: #c04a3c;
                            text-transform: uppercase; margin-top: 12px; font-weight: 600; }
.reco-card.active.tier-green .active-marker { color: #4a7a2a; }
.reco-card.muted { color: #a8a8a8; }
.reco-card.muted .tier-label { color: #a8a8a8; }
.reco-card.muted .eyebrow { color: #a8a8a8; }

/* ── Overview two-column ───────────────────────────────────────── */
.overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
                 margin: 0 0 22px 0; }
.overview-card { border: 1px solid #e5dccd; background: #fbfaf6;
                 padding: 14px 16px; }
.card-title { font-size: 8.5pt; letter-spacing: 0.15em; color: #6f6355;
              text-transform: uppercase; margin: 0 0 12px 0; font-weight: 600; }

/* Score overview: name | bar | value */
.score-row { display: flex; align-items: center; padding: 5px 0; font-size: 10pt; }
.score-row .score-name { flex: 0 0 44%; color: #2a2a2a; }
.score-row .score-track { flex: 1; height: 6px; background: #ede6d3;
                          border-radius: 3px; margin: 0 12px; overflow: hidden; }
.score-row .score-bar { height: 100%; background: #a08a30; }
.score-row .score-value { flex: 0 0 30px; text-align: right; color: #6a6a6a; }
.score-summary { border-top: 1px solid #ede6d3; margin-top: 12px; padding-top: 12px; }
.score-summary-row { display: flex; justify-content: space-between; padding: 4px 0;
                     font-weight: 600; color: #1a4045; }
.score-summary-row .label { color: #1a4045; }
.score-summary-row .value { color: #1a4045; }
.score-summary-row.overall .value { font-size: 12pt; }

/* At-a-glance card */
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 12px 0; }
.chip { display: inline-block; padding: 4px 10px; background: white;
        border: 1px solid #e5dccd; border-radius: 12px; font-size: 8.5pt;
        color: #4a4a4a; }
.glance-summary { font-size: 9.5pt; color: #4a4a4a; margin: 0; line-height: 1.55; }

/* ── Dimension detail (below-the-fold) ─────────────────────────── */
.dim-detail { padding: 14px 0; border-bottom: 1px dashed #d5cfc0; }
.dim-detail:last-of-type { border-bottom: none; }
.dim-detail-header { display: flex; justify-content: space-between; align-items: baseline;
                     margin-bottom: 6px; }
.dim-detail-name { font-weight: 700; color: #1a4045; font-size: 10.5pt; }
.dim-detail-score { color: #6a6a6a; font-size: 10pt; }
.dim-detail-quote { color: #444; font-size: 9.5pt; margin: 6px 0 8px 0;
                    font-style: italic; }
.dim-detail-notes { color: #555; font-size: 9.5pt; line-height: 1.6; margin: 0; }

/* ── Top excerpts callouts ─────────────────────────────────────── */
.excerpt-card { background: #f4efe0; border-left: 4px solid #a08a30;
                padding: 12px 16px; margin: 14px 0 6px 0;
                color: #333; font-size: 9.5pt; line-height: 1.55; }
.excerpt-note { color: #555; font-size: 9.5pt; margin: 0 0 14px 0; line-height: 1.55; }

/* ── Capability map: blind-spot bullets w/ bold label ──────────── */
.blind-spots li strong { color: #1a4045; }

/* ── Footer ────────────────────────────────────────────────────── */
footer.doc { margin-top: 32px; padding-top: 10px; border-top: 1px solid #d5cfc0;
             color: #8a7a5e; font-size: 8pt; line-height: 1.5; }
"""


def _bullets(items: list) -> str:
    if not items:
        return ""
    items = [escape(str(i).strip()) for i in items if str(i).strip()]
    if not items:
        return ""
    return "<ul>" + "".join(f"<li>{i}</li>" for i in items) + "</ul>"


def _header(role_title: str, candidate_name: str, kind: str) -> str:
    kind_label = f"{kind} report"
    meta = f"{kind_label} · {candidate_name} · {role_title}"
    return f"""
<header class="doc">
  <span class="brand">Basanite</span>
  <span class="meta">{escape(meta)}</span>
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
        body.append(f'<h2>Overall</h2><div class="exec-callout">{overall}</div>')
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


# The 5-tier routing model projects onto 3 sample cards. Any
# not/strongly-not tier lights the "Not Recommended" card; can_progress
# and recommended both light "Recommended"; only strongly_recommended
# lights the strongest card. Kept as a projection (rather than
# collapsing to 3 tiers) so the underlying rubric and the dashboard
# routing logic remain unchanged.
_TIER_TO_CARD: dict[str, int] = {
    "strongly_not_recommended": 0,
    "not_recommended": 0,
    "can_progress": 1,
    "recommended": 1,
    "strongly_recommended": 2,
}

_CARD_DEFS: list[tuple[str, str, str]] = [
    # (tier-class dot color, main label line 1, main label line 2)
    ("dot-red", "Not Recommended", "to Interview"),
    ("dot-green", "Recommended", "to Interview"),
    ("dot-green", "Strongly Recommended", "to Interview"),
]


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


def _headline_callout(report: dict) -> str:
    """Executive-summary callout at the top of the hirer report.

    Prefers the explicit `headline_summary` field; falls back to
    `recommendation_rationale`, then `comprehensive_assessment.one_sentence_summary`,
    so reports predating the new field still render something.
    """
    text = (
        str(report.get("headline_summary") or "").strip()
        or str(report.get("recommendation_rationale") or "").strip()
    )
    if not text:
        summary = report.get("comprehensive_assessment") or {}
        text = str(summary.get("one_sentence_summary") or "").strip()
    if not text:
        return ""
    return f'<div class="exec-callout">{escape(text)}</div>'


def _reco_cards(report: dict) -> str:
    """3-card 'Interview recommendation' strip. The active card is
    determined by projecting the 5-tier routing model down to 3 card
    slots (see _TIER_TO_CARD). Non-active cards are muted; only the
    active card gets a colored border and the "◀ THIS CANDIDATE" marker.
    """
    tier = str(report.get("recommendation") or "").strip()
    if tier not in _TIER_TO_CARD:
        tier = _derive_recommendation_pdf(report.get("composite_score"))
    active_idx = _TIER_TO_CARD.get(tier, 1)

    cards: list[str] = []
    for idx, (dot_class, line1, line2) in enumerate(_CARD_DEFS):
        is_active = idx == active_idx
        tier_class = "tier-green" if dot_class == "dot-green" else "tier-red"
        classes = ["reco-card", dot_class, tier_class]
        classes.append("active" if is_active else "muted")
        marker = (
            '<div class="active-marker">&#9664; This Candidate</div>'
            if is_active else ""
        )
        cards.append(
            f'<div class="{" ".join(classes)}">'
            f'<div class="dot"></div>'
            f'<div class="eyebrow">Outcome</div>'
            f'<div class="tier-label">{escape(line1)}<br>{escape(line2)}</div>'
            f'{marker}'
            f'</div>'
        )
    return '<div class="reco-cards">' + "".join(cards) + '</div>'


def _score_overview_card(report: dict) -> str:
    """Left card of the two-column overview: dimension bar chart,
    overall composite, cheating risk.
    """
    scoring = report.get("scoring_summary") or []
    if not scoring:
        return ""
    rows: list[str] = []
    for s in scoring:
        if not isinstance(s, dict):
            continue
        raw_name = s.get("dimension") or s.get("name") or ""
        name = escape(_format_key(raw_name))
        score = s.get("score")
        if isinstance(score, (int, float)):
            pct = max(0.0, min(1.0, (float(score) - 1) / 4)) * 100
            score_str = f"{float(score):.1f}"
        else:
            pct = 0.0
            score_str = escape(str(score or ""))
        rows.append(
            f'<div class="score-row">'
            f'<div class="score-name">{name}</div>'
            f'<div class="score-track"><div class="score-bar" style="width:{pct:.1f}%"></div></div>'
            f'<div class="score-value">{score_str}</div>'
            f'</div>'
        )

    composite = report.get("composite_score")
    composite_html = ""
    if isinstance(composite, (int, float)):
        composite_html = (
            f'<div class="score-summary-row overall">'
            f'<div class="label">Overall</div>'
            f'<div class="value">{float(composite):.1f} / 5</div>'
            f'</div>'
        )

    risk = ""
    assessment = report.get("comprehensive_assessment") or {}
    if isinstance(assessment, dict):
        r = assessment.get("cheating_risk")
        if isinstance(r, str) and r.strip():
            risk = r.strip().capitalize()
        elif isinstance(r, dict):
            level = r.get("level")
            if isinstance(level, str) and level.strip():
                risk = level.strip().capitalize()
    risk_html = (
        f'<div class="score-summary-row">'
        f'<div class="label">Cheating risk</div>'
        f'<div class="value">{escape(risk)}</div>'
        f'</div>'
        if risk else ""
    )

    summary_html = ""
    if composite_html or risk_html:
        summary_html = f'<div class="score-summary">{composite_html}{risk_html}</div>'

    return (
        f'<div class="overview-card">'
        f'<div class="card-title">Score Overview</div>'
        f'{"".join(rows)}'
        f'{summary_html}'
        f'</div>'
    )


def _at_a_glance_card(report: dict) -> str:
    """Right card of the two-column overview: pill tags + short paragraph.

    Prefers the explicit `at_a_glance` field. Falls back to a synthesised
    view built from `top_excerpts` one-liners and the one-sentence
    summary so legacy reports still render something usable.
    """
    glance = report.get("at_a_glance") or {}
    tags_raw = glance.get("tags") if isinstance(glance, dict) else []
    summary_raw = glance.get("summary") if isinstance(glance, dict) else ""

    if not tags_raw:
        # Fallback: pull dimension names from top_excerpts as tag stand-ins.
        # It's coarse but better than an empty box.
        seen: set[str] = set()
        fallback_tags: list[str] = []
        for e in (report.get("top_excerpts") or [])[:6]:
            if not isinstance(e, dict):
                continue
            dim = _format_key(str(e.get("dimension") or ""))
            if dim and dim not in seen:
                seen.add(dim)
                fallback_tags.append(dim)
        tags_raw = fallback_tags

    if not summary_raw:
        assessment = report.get("comprehensive_assessment") or {}
        if isinstance(assessment, dict):
            summary_raw = assessment.get("one_sentence_summary") or ""

    if not tags_raw and not summary_raw:
        return ""

    chips = "".join(
        f'<span class="chip">{escape(str(t).strip())}</span>'
        for t in (tags_raw or []) if str(t).strip()
    )
    summary_html = (
        f'<p class="glance-summary">{escape(str(summary_raw).strip())}</p>'
        if summary_raw else ""
    )
    return (
        f'<div class="overview-card">'
        f'<div class="card-title">At a Glance</div>'
        f'<div class="chips">{chips}</div>'
        f'{summary_html}'
        f'</div>'
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


def _blind_spot_li(item: str) -> str:
    """Render a blind-spot bullet with a bold label if the string is
    formatted as 'Label: description'. Falls back to a plain bullet
    when no colon is present."""
    s = str(item).strip()
    if not s:
        return ""
    if ":" in s:
        label, _, rest = s.partition(":")
        label = label.strip()
        rest = rest.strip()
        if label and rest and len(label) <= 80:
            return f"<li><strong>{escape(label)}:</strong> {escape(rest)}</li>"
    return f"<li>{escape(s)}</li>"


def _hirer_html(role_title: str, candidate_name: str, report: dict) -> str:
    body: list[str] = []

    # 1. Executive summary callout — first thing after the title.
    callout = _headline_callout(report)
    if callout:
        body.append(callout)

    # 2. Interview recommendation: three-card strip with the active
    #    tier highlighted. Rendered whenever we have a recommendation or
    #    a composite score to derive one from.
    has_recommendation = bool(str(report.get("recommendation") or "").strip())
    has_composite = isinstance(report.get("composite_score"), (int, float))
    if has_recommendation or has_composite:
        body.append("<h2>Interview recommendation</h2>")
        body.append(_reco_cards(report))

    # 3. Two-column overview: score bars + at-a-glance chips.
    left = _score_overview_card(report)
    right = _at_a_glance_card(report)
    if left or right:
        body.append(f'<div class="overview-grid">{left}{right}</div>')

    # 4. Dimension scores — detail.
    scoring = report.get("scoring_summary") or []
    if scoring:
        details = []
        for s in scoring:
            if not isinstance(s, dict):
                continue
            raw_name = s.get("dimension") or s.get("name") or ""
            name = escape(_format_key(raw_name))
            score = s.get("score")
            score_str = (
                f"{float(score):.1f} / 5"
                if isinstance(score, (int, float))
                else escape(str(score or ""))
            )
            quote = escape(str(s.get("quotation_basis") or "").strip())
            notes = escape(str(s.get("notes") or "").strip())
            quote_html = f'<div class="dim-detail-quote">&ldquo;{quote}&rdquo;</div>' if quote else ""
            notes_html = f'<p class="dim-detail-notes">{notes}</p>' if notes else ""
            details.append(
                f'<div class="dim-detail">'
                f'<div class="dim-detail-header">'
                f'<div class="dim-detail-name">{name}</div>'
                f'<div class="dim-detail-score">{score_str}</div>'
                f'</div>'
                f'{quote_html}{notes_html}'
                f'</div>'
            )
        if details:
            body.append("<h2>Dimension scores &mdash; detail</h2>" + "".join(details))

    # 5. Top excerpts — each as a gold-callout card + plain-text note.
    excerpts = report.get("top_excerpts") or []
    if excerpts:
        items = []
        for e in excerpts:
            if isinstance(e, dict):
                quote = escape(str(e.get("excerpt") or e.get("quote") or "").strip())
                why = escape(
                    str(
                        e.get("why_selected")
                        or e.get("why")
                        or e.get("reason")
                        or ""
                    ).strip()
                )
                if not quote:
                    continue
                why_html = f'<p class="excerpt-note">{why}</p>' if why else ""
                items.append(f'<div class="excerpt-card">{quote}</div>{why_html}')
            else:
                s = escape(str(e).strip())
                if s:
                    items.append(f'<div class="excerpt-card">{s}</div>')
        if items:
            body.append("<h2>Top excerpts</h2>" + "".join(items))

    # 6. Capability map — transfer capability paragraph + blind-spot
    #    bullets with bold labels. Other capability fields (demonstrated
    #    depth, surface fluency, expert verification) are captured in
    #    the top-of-report sections and omitted here to keep the layout
    #    matching the sample.
    cap = report.get("capability_map") or {}
    if isinstance(cap, dict):
        cap_parts: list[str] = []
        transfer = str(cap.get("transfer_capability") or "").strip()
        if transfer:
            cap_parts.append(
                f'<h3>Transfer capability</h3><p>{escape(transfer)}</p>'
            )
        blind = cap.get("blind_spots") or []
        blind_items = [_blind_spot_li(item) for item in blind]
        blind_items = [it for it in blind_items if it]
        if blind_items:
            cap_parts.append(
                '<h3>Blind spots</h3>'
                f'<ul class="blind-spots">{"".join(blind_items)}</ul>'
            )
        if cap_parts:
            body.append("<h2>Capability map</h2>" + "".join(cap_parts))

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
