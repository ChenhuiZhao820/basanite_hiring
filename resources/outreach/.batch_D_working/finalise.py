"""
Consolidate the three agent outputs into leads_batch_D.json with IDs, subjects,
and personalised draft bodies. Style rules (from scholarOutreachTemplate.txt):
UK English, no em dashes, no AI-sounding phrases, warm and human, low-pressure
ask. Manchester alum => soft MCR connection; non-alum MCR-HQ => ecosystem ref.
Short form = hiring-pain hook; long form = critical/commercial perspective.
"""

import json
from datetime import date

BATCH_DIR = "/Users/andrewrobertson/dev/Basanite/resources/outreach/.batch_D_working"
OUT_JSON  = "/Users/andrewrobertson/dev/Basanite/resources/outreach/leads_batch_D.json"
OUT_TXT   = "/Users/andrewrobertson/dev/Basanite/resources/outreach/leads_batch_D_drafts.txt"

TODAY = date.today().isoformat()
START_ID = 66

with open(f"{BATCH_DIR}/merged_deduped.json") as fp:
    records = json.load(fp)


def first_name(full: str) -> str:
    return full.split()[0].strip()


def role_hint(lead: dict) -> str:
    """Role phrase for email subject (plural noun)."""
    sig = (lead.get("open_roles_signal") or "").lower()
    if not sig:
        return "engineers"
    if "ml" in sig or "machine learning" in sig:
        return "ML engineers"
    if "ai engineer" in sig or "founding ai" in sig:
        return "AI engineers"
    if "cyber" in sig or "security" in sig:
        return "security engineers"
    if "forward deployed" in sig:
        return "forward deployed engineers"
    if "product engineer" in sig:
        return "product engineers"
    if "backend" in sig:
        return "backend engineers"
    if "founding" in sig:
        return "founding engineers"
    if "data" in sig:
        return "data engineers"
    return "engineers"


def role_noun_singular(lead: dict) -> str:
    """Role phrase usable as an adjective before 'role'."""
    sig = (lead.get("open_roles_signal") or "").lower()
    if not sig:
        return "engineering"
    if "ml" in sig or "machine learning" in sig:
        return "ML"
    if "ai engineer" in sig or "founding ai" in sig:
        return "AI engineering"
    if "cyber" in sig or "security" in sig:
        return "security"
    if "forward deployed" in sig:
        return "forward deployed"
    if "product engineer" in sig:
        return "product engineering"
    if "backend" in sig:
        return "backend"
    if "founding" in sig:
        return "founding engineering"
    if "data" in sig:
        return "data engineering"
    return "engineering"


def tidy_course(course: str) -> str:
    """Collapse a course line like 'BSc Computer Science 2012-2016 (First Class Honours)'
    to 'Computer Science' for natural inline use."""
    if not course:
        return ""
    c = course
    # Drop year ranges
    import re
    c = re.sub(r"\d{4}\s*-\s*\d{4}", "", c)
    c = re.sub(r"\d{4}", "", c)
    # Drop degree classes and parentheticals
    c = re.sub(r"\(.*?\)", "", c)
    c = re.sub(r"First Class Honours|First-Class Honours|2:1|2\.1|First Class", "", c, flags=re.IGNORECASE)
    # Drop degree prefixes
    c = re.sub(r"\b(BSc|BEng|MEng|MSc|MPhil|PhD|LLB|MBA|BA)\b", "", c)
    # Drop school names and generic references
    c = re.sub(r"University of Manchester", "", c, flags=re.IGNORECASE)
    c = re.sub(r"Alliance Manchester Business School|Manchester Business School", "MBA (AMBS)", c, flags=re.IGNORECASE)
    c = re.sub(r"at UoM|at Manchester|Masood Entrepreneurship Centre", "", c, flags=re.IGNORECASE)
    # Drop trailing punctuation / whitespace
    c = re.sub(r"[,;].*$", "", c)
    c = re.sub(r"\s+", " ", c)
    c = c.strip(" ,;.-\t")
    return c


def build_subject(lead: dict) -> str:
    company = lead["company"]
    tpl = lead.get("template_recommendation", "short_form")
    alum = lead.get("manchester_alum", False)
    sig = lead.get("open_roles_signal")
    if tpl == "short_form" and sig:
        return f"Saw {company} is hiring {role_hint(lead)}"
    if alum:
        # Warm alum opener
        return f"Question from a fellow Manchester grad"
    return f"Question on how {company} evaluates technical hires"


MCR_ALUM_OPENERS = [
    "Another Manchester grad here. {hook_sentence}",
    "Writing as a fellow Manchester alum. {hook_sentence}",
    "Drew here, also UoM CS. {hook_sentence}",
]


def hook_sentence(lead: dict) -> str:
    """Reuse the personalisation hook as the opening specific reference."""
    return lead["personalisation_hook"].strip().rstrip(".") + "."


def plain_hook(lead: dict) -> str:
    """Return the hook as a finished sentence. Kept simple: readers will parse
    subject-less openings using the company name from the subject line."""
    hook = lead["personalisation_hook"].strip()
    if not hook.endswith("."):
        hook += "."
    return hook


CLEAN_SUBJECTS = {
    "computer science", "cs", "computer systems engineering",
    "artificial intelligence", "ai", "electrical engineering",
    "software engineering", "civil engineering", "mechanical engineering",
    "mathematics", "economics", "finance", "law", "physics", "chemistry",
    "biology", "biochemistry", "geology", "geography", "history",
    "philosophy", "english literature", "politics",
}


def alum_phrase(course: str) -> str:
    """Short natural phrase mentioning the Manchester course. Drops the
    course mention when the parsed string isn't a clean subject name."""
    if not course:
        return " I'm also a Manchester CS grad."
    c = course.strip()
    cl = c.lower()
    if cl in ("computer science", "cs"):
        return " I'm a Manchester CS grad too."
    # Only mention the course if it's a recognisable degree subject
    if cl in CLEAN_SUBJECTS:
        return f" I'm a Manchester CS grad too; saw you read {c.title()} there."
    return " I'm also a Manchester CS grad."


def short_form_body(lead: dict) -> str:
    first = first_name(lead["name"])
    company = lead["company"]
    hook = plain_hook(lead)
    alum = lead.get("manchester_alum", False)
    course = tidy_course(lead.get("manchester_course") or "")

    if alum:
        alum_ref = alum_phrase(course)
        opener = f"Drew Robertson here, co-founder and CTO at Basanite.{alum_ref} {hook}"
    else:
        opener = f"Drew Robertson here, co-founder at Basanite. {hook}"

    pitch = (
        "We're early, currently in customer and concept validation. Basanite runs "
        "structured AI-led technical interviews end to end, so every candidate gets "
        "the same depth of questioning and you get quotable evidence per candidate "
        "rather than opaque scores."
    )

    role_adj = role_noun_singular(lead)
    offer = (
        f"Happy to front the credits for a free run on one of {company}'s current "
        f"{role_adj} roles, takes about ten minutes to set up."
    )

    close = "Open to a quick conversation either way. Honest feedback is more useful to us than a yes."

    return f"Hi {first},\n\n{opener}\n\n{pitch}\n\n{offer}\n\n{close}\n\nDrew\nbasanite.co.uk"


def long_form_body(lead: dict) -> str:
    first = first_name(lead["name"])
    company = lead["company"]
    title = lead.get("title", "")
    hook = plain_hook(lead)
    alum = lead.get("manchester_alum", False)
    course = tidy_course(lead.get("manchester_course") or "")

    if alum:
        alum_ref = alum_phrase(course)
        opener = f"Drew Robertson, co-founder and CTO at Basanite.{alum_ref} {hook}"
    else:
        opener = f"Drew Robertson, co-founder at Basanite. {hook}"

    context = (
        "We're a small team out of Manchester building an AI technical interview "
        "platform. We're early, currently in customer and concept validation rather "
        "than selling, and we're trying to be rigorous about what our product can and "
        "cannot honestly claim before we scale distribution."
    )

    # Questions tailored by segment/role
    questions = build_questions(lead, title)

    ask = (
        "Not chasing endorsement, I'd rather have a critical or commercial read from "
        "someone closer to the problem than we are. Twenty minutes on a call would be "
        "really useful, but happy with written replies if easier."
    )

    return f"Hi {first},\n\n{opener}\n\n{context}\n\n{questions}\n\n{ask}\n\nDrew\nbasanite.co.uk"


def build_questions(lead: dict, title: str) -> str:
    """2-3 tailored questions. Light variation based on role signals."""
    tlower = (title or "").lower()
    company = lead["company"]
    if "cto" in tlower or "engineering" in tlower or "technical" in tlower:
        return (
            "Three questions I'd value your take on:\n"
            f"1. When you screen senior engineering candidates at {company}, what's the signal you trust least from a CV and why?\n"
            "2. If AI handles routine technical execution increasingly well, which human qualities are you now weighting higher when hiring, and how are you surfacing them?\n"
            "3. Where would a tool like ours need to prove itself before you'd trust it with first-round screening rather than just a second opinion?"
        )
    if "ceo" in tlower or "founder" in tlower or "co-founder" in tlower:
        return (
            "Three questions I'd value your take on:\n"
            f"1. At {company}'s current stage, how much of first-round technical screening are you personally still doing, and what breaks first as you scale?\n"
            "2. What would it take for a structured AI interview to be a genuine upgrade on your current process, versus a cheaper version of the same thing?\n"
            "3. Where do you think AI-led assessment is most likely to produce false positives or false negatives, and how would you want that flagged?"
        )
    # Generic
    return (
        "Three questions I'd value your take on:\n"
        f"1. How does {company} currently decide whether an engineering hire worked out, six months in?\n"
        "2. What's the failure mode you've seen most often in interview-to-performance correlation?\n"
        "3. Where would a tool like ours need to prove itself before you'd trust it with first-round screening?"
    )


def email_confidence(lead: dict) -> str:
    return lead.get("email_confidence", "inferred_medium")


out_records = []
drafts_text_blocks = []

for i, lead in enumerate(records):
    lead_id = f"{START_ID + i:04d}"
    tpl = lead.get("template_recommendation", "short_form")

    subject = build_subject(lead)
    body = short_form_body(lead) if tpl == "short_form" else long_form_body(lead)

    segment = lead.get("company_segment", "uk_startup")
    if lead.get("manchester_alum"):
        segment = "manchester_alum_startup"

    rec = {
        "id": lead_id,
        "name": lead["name"],
        "title": lead.get("title", ""),
        "company": lead["company"],
        "company_domain": lead["company_domain"],
        "company_segment": segment,
        "manchester_alum": lead.get("manchester_alum", False),
        "manchester_course": lead.get("manchester_course"),
        "headcount_estimate": lead.get("headcount_estimate"),
        "funding_stage": lead.get("funding_stage"),
        "company_hq": lead.get("company_hq"),
        "email": lead.get("email", ""),
        "alt_email": None,
        "email_pattern": lead.get("email_pattern", "unknown"),
        "email_confidence": email_confidence(lead),
        "source_url": lead.get("source_url", ""),
        "source_type": lead.get("source_type", ""),
        "personalisation_hook": lead["personalisation_hook"],
        "open_roles_signal": lead.get("open_roles_signal"),
        "subject": subject,
        "draft_body": body,
        "draft_id": None,
        "alt_draft_id": None,
        "draft_status": "pending_send",
        "created_at": TODAY,
        "template": tpl,
    }
    out_records.append(rec)

    drafts_text_blocks.append(
        f"===== {lead_id} | {rec['name']} | {rec['title']} | {rec['company']} ({rec['company_domain']}) =====\n"
        f"Manchester alum: {rec['manchester_alum']} ({rec.get('manchester_course') or '-'})\n"
        f"Email: {rec['email']} ({rec['email_confidence']})\n"
        f"Source: {rec['source_url']}\n"
        f"Hook: {rec['personalisation_hook']}\n"
        f"Template: {tpl}\n"
        f"-----\n"
        f"SUBJECT: {subject}\n\n{body}\n"
    )


with open(OUT_JSON, "w") as fp:
    json.dump(out_records, fp, indent=2, ensure_ascii=False)

with open(OUT_TXT, "w") as fp:
    fp.write(
        "BASANITE OUTREACH BATCH D, generated {}\n".format(TODAY) +
        "{} leads total. {} confirmed Manchester alumni.\n".format(
            len(out_records),
            sum(1 for r in out_records if r["manchester_alum"])
        ) +
        "Emails are pattern-inferred; verify with a second tool before send.\n" +
        "=" * 90 + "\n\n" +
        "\n".join(drafts_text_blocks)
    )

print(f"Wrote {len(out_records)} leads to {OUT_JSON}")
print(f"Wrote drafts to {OUT_TXT}")
print(f"Manchester alum: {sum(1 for r in out_records if r['manchester_alum'])}")
print(f"Short form: {sum(1 for r in out_records if r['template'] == 'short_form')}")
print(f"Long form: {sum(1 for r in out_records if r['template'] == 'long_form')}")
