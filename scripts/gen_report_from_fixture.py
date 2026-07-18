"""
Generate hirer/candidate reports from a fixture directory.

Skips the interview entirely — loads a saved transcript + role + CV from JSON
and calls the report generators directly. Use this to iterate on report format
without running a full assessment.

A fixture directory must contain three files:
    role.json         # {title, job_description, technical_depth, dimensions}
    cv.json           # {name, experience_path, anchor_points}
    transcript.json   # [{"role": "assistant"|"user", "content": "..."}, ...]

Usage:
    python -m scripts.gen_report_from_fixture --fixture resources/fixtures/report_test
    python -m scripts.gen_report_from_fixture --fixture <dir> --which hirer
    python -m scripts.gen_report_from_fixture --fixture <dir> --out out/
"""
import argparse
import asyncio
import json
import os
import sys

# Make repo root importable when run as `python scripts/gen_report_from_fixture.py`.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.report import generate_hirer_report, generate_candidate_report
from core.pdf import _hirer_html, _candidate_html


def _load(path: str) -> dict | list:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


async def _run(fixture_dir: str, which: str, out_dir: str | None, pdf: bool) -> None:
    role = _load(os.path.join(fixture_dir, "role.json"))
    cv = _load(os.path.join(fixture_dir, "cv.json"))
    transcript = _load(os.path.join(fixture_dir, "transcript.json"))

    results: dict[str, dict] = {}

    if which in ("hirer", "both"):
        print("Generating hirer report...", file=sys.stderr)
        results["hirer"] = await generate_hirer_report(transcript, role, cv)

    if which in ("candidate", "both"):
        print("Generating candidate report...", file=sys.stderr)
        results["candidate"] = await generate_candidate_report(transcript, role, cv)

    out = out_dir or fixture_dir
    os.makedirs(out, exist_ok=True)
    role_title = role.get("title", "the role")
    candidate_name = cv.get("name", "Candidate")

    for name, report in results.items():
        rendered = json.dumps(report, indent=2, ensure_ascii=False)
        json_path = os.path.join(out, f"{name}.json")
        with open(json_path, "w", encoding="utf-8") as f:
            f.write(rendered)
        print(f"  wrote {json_path}", file=sys.stderr)

        html = (_hirer_html if name == "hirer" else _candidate_html)(
            role_title, candidate_name, report
        )
        html_path = os.path.join(out, f"{name}.html")
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"  wrote {html_path}", file=sys.stderr)

        if pdf:
            try:
                from core.pdf import render_report_pdf
                pdf_bytes = render_report_pdf(
                    report_type=name,
                    role_title=role_title,
                    candidate_name=candidate_name,
                    report=report,
                )
                pdf_path = os.path.join(out, f"{name}.pdf")
                with open(pdf_path, "wb") as f:
                    f.write(pdf_bytes)
                print(f"  wrote {pdf_path}", file=sys.stderr)
            except OSError as e:
                print(
                    f"  [pdf] WeasyPrint failed ({e.__class__.__name__}): "
                    "GTK system libraries missing on Windows. "
                    "Open the .html file in a browser and use Ctrl+P → Save as PDF.",
                    file=sys.stderr,
                )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", required=True, help="Fixture directory")
    parser.add_argument(
        "--which",
        choices=("hirer", "candidate", "both"),
        default="both",
    )
    parser.add_argument("--out", help="Optional dir to also write reports to")
    parser.add_argument("--pdf", action="store_true", help="Also render PDF via WeasyPrint")
    args = parser.parse_args()

    asyncio.run(_run(args.fixture, args.which, args.out, args.pdf))


if __name__ == "__main__":
    main()
