# Basanite, AI-Powered Technical Assessment

Basanite conducts AI-powered technical interviews that assess genuine capability, not performed competence. Named after the dark volcanic touchstone historically used to test gold purity.

**Domain:** basanite.co.uk (pending deployment)

---

## What It Does

1. **Hirers** paste a job description and configure evaluation dimensions
2. **Candidates** receive an assessment link, upload their CV, and enter a ~45 min AI-conducted interview
3. **Basanite** evaluates across 8 capability dimensions using experience-grounded questioning, transfer tests, and anti-cheating detection
4. **Dual reports** are generated: a hirer briefing document + a constructive candidate feedback report
5. **Hirers** see a ranked candidate queue with dimension scores grounded in specific quotes

---

## Stack

| Layer | Tech |
|-------|------|
| Web | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Auth + DB | Supabase (PostgreSQL) |
| Interview LLM | Claude Sonnet 4.6 (via Anthropic SDK) |
| Auxiliary LLM | Claude Haiku 4.5 (CV extraction, dimension recommendation) |
| Backend | Python, FastAPI, asyncio |
| Deploy | Vercel (web), Render (API) |

---

## Setup

### Python backend

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in credentials
uvicorn api:app --reload --port 8000
```

### Web frontend

```bash
cd web && npm install
# create web/.env.local with the variables below
npm run dev
```

### Environment variables

**Python (`.env`):**

| Variable | Notes |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `ELEVENLABS_API_KEY` | ElevenLabs API key (voice interviewer) |
| `ELEVENLABS_AGENT_ID` | ElevenLabs Conversational AI agent ID |
| `RESEND_API_KEY` | Resend API key (candidate report emails) |
| `RESEND_FROM` | Sender for report emails, e.g. `Basanite <reports@your-domain>` |
| `SUPABASE_URL` | Supabase Settings -> API |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `PIPELINE_API_SECRET` | Shared secret, generate with `openssl rand -hex 32` |

**Web (`web/.env.local`):**

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Same as SUPABASE_URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Service role key (server-side only) |
| `PIPELINE_URL` | Backend server URL (default: http://localhost:8000) |
| `PIPELINE_API_SECRET` | Must match Python value |

### Database migrations

Run the migrations in `supabase/migrations/` in order in the Supabase SQL editor. Key Basanite tables:

- `roles`, hiring positions with evaluation dimensions and interview prompt
- `assessments`, individual candidate evaluations
- `interview_sessions`, full conversation state
- `dimension_scores`, per-dimension scores with quotation basis
- `reports`, hirer and candidate feedback reports

---

## Architecture

```
Hirer Dashboard (Next.js)
  └── Create role -> Configure dimensions -> Go live
                                               │
                                     Assessment link shared
                                               │
Candidate Portal (Next.js)                     │
  └── /assess/{token} -> Upload CV -> AI Interview (SSE streaming)
                                               │
                                        FastAPI Backend
                                               │
                              ┌────────────────┼────────────────┐
                     CV Extraction      Interview Agent      Report Generator
                     (Haiku)           (Sonnet 4.6)          (Sonnet 4.6)
                              └────────────────┼────────────────┘
                                               │
                                          Supabase
                              (roles, assessments, scores, reports)
```

---

## The 8 Evaluation Dimensions

1. **Judgment under ambiguity**, acting decisively on incomplete information
2. **Tacit knowledge extraction**, surfacing knowledge that lives in experience
3. **Intuition under data scarcity**, sound judgment when data is insufficient
4. **Psychological safety & collective learning**, creating error-correcting team conditions
5. **Creative problem reframing**, recognising when the team solves the wrong problem
6. **Ethical reasoning**, navigating real tradeoffs with integrity
7. **Capacity to be changed by experience**, learning from experience, not just accumulating it
8. **Technical judgment depth**, understanding boundaries of technical decisions
