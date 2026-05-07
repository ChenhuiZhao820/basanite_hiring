# Basanite test suite

This directory holds the Python (pytest) test suite. The web suite lives at
`web/lib/**/*.test.ts` and `web/components/**/*.test.tsx` and is run with
Vitest.

## Quick start

```bash
# Python
pip install -r requirements-dev.txt
make test            # python -m pytest -q
make test-cov        # with coverage report

# Web
cd web
npm install
npm test             # vitest run
npm run test:cov     # with coverage
```

## Layout

```
tests/
├── conftest.py                # Shared fixtures: env vars, FakeSupabase,
│                              # FakeAnthropic, sample data factories
├── unit/                      # Tier 1-2: pure helpers + LLM contracts
│   ├── test_log_safe.py       # PII scrubbing
│   ├── test_llm_clean_json.py # JSON cleaning
│   ├── test_llm_service.py    # LLMService (mocked Anthropic)
│   ├── test_interview_*.py    # sanitiser, normaliser, prompt builder
│   ├── test_director_directive.py
│   ├── test_cv_extract.py
│   ├── test_dimensions_agent.py
│   ├── test_report_hirer.py
│   ├── test_report_candidate.py
│   ├── test_orgs_helpers.py
│   ├── test_voices_catalogue.py
│   ├── test_pdf_helpers.py
│   ├── test_email_renderers.py
│   ├── test_ats_adapters_format.py
│   ├── test_ats_crypto.py
│   ├── test_ats_signing.py
│   └── db/                    # Tier 3: DB layer (mocked Supabase)
│       ├── test_db_roles.py
│       ├── test_db_assessments.py
│       ├── test_db_sessions.py
│       └── test_db_scores_reports.py
└── api/                       # Tier 5: FastAPI endpoint tests (TBD)
```

## Mocking strategy

* **Anthropic**: `fake_anthropic` fixture patches `anthropic.AsyncAnthropic` and
  exposes `messages.create` / `messages.stream` mocks. Configure responses with
  `make_response('{"k":1}')`.
* **Supabase**: `fake_supabase` fixture patches `core.db.get_client` to return
  a `FakeSupabase` that records every fluent call (`.table().select().eq()...`)
  and returns a configurable `execute()` payload. Tests both happy paths and
  simulated DB errors via `execute_raises`.
* **Resend / Merge / WeasyPrint**: tested with focused `monkeypatch`/`patch`
  calls rather than autouse fixtures, since each is used in only a handful of
  modules.

## What's still pending (per the approved plan)

The scaffolding is complete and Tiers 1-3 (Python) plus Tier 1 (web) ship in
this PR. Future PRs land:

* Tier 4 Python — side-effect modules (`core/email send_*`, `core/pdf
  render_report_pdf`, `core/ats fetch_candidate_cv_text` / `push_results`,
  `core/retention.run_retention_sweep`, `interview.generate_reports`).
* Tier 5 Python — every FastAPI endpoint with the FastAPI TestClient.
* Tier 6/7 Web — full RTL coverage of the component tree (the heaviest is
  `VoiceInterview`, planned to split across `cues / director / lifecycle /
  recording / timers` test files).
* Tier 8 Web — every `app/api/**/route.ts` handler with MSW.
* Tier 9 Web — page smoke tests.

The plan document lives at
`/root/.claude/plans/create-comprehensive-and-critical-zesty-quasar.md`.
