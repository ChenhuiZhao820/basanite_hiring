# Test Mode — Implementation Plan

**Audience:** a Claude Code session working in this same workspace (`C:\Users\tkszt\basanite_hiring`).
**Status:** plan only — nothing below has been built yet.

## Goal

Let an internal tester walk the *entire* candidate journey (assessment link → CV
upload → onboarding → mic check → live interview screen → completion screen)
exactly as a real candidate would, **but**:

1. Instead of running the real evaluation interview, the agent makes light,
   friendly small talk and wraps up quickly.
2. **No** hirer or candidate report is generated.
3. The tester always appears **pinned to the bottom** of the hirer's candidate
   queue, visually unmistakable as a test artifact — never confusable with a
   real candidate.

The whole feature is driven by **one server-side flag, `is_mock`, decided once at
entry and read everywhere else.** No client input ever decides mock-ness.

---

## Key finding that shapes the design

The role detail queue at
[`web/app/dashboard/roles/[id]/page.tsx:32`](web/app/dashboard/roles/[id]/page.tsx)
orders candidates by **`created_at` descending — there is no score-based
ranking.** `avgScore` is computed per row (`page.tsx:127-129`) but nothing sorts
by it. So "always ranked lowest" is **not** achievable by giving low scores —
it must be an explicit "pin `is_mock` rows to the bottom" sort applied after the
fetch. Do not try to fake zero `dimension_scores` to sink the row; a zero reads
as "a real candidate who bombed," which is exactly the confusion we're avoiding.

---

## Decisions to confirm before building

1. **Entry path (containment).** Recommended: a dedicated **Test Mode entry gated
   by an API env var** (`TEST_MODE_ENABLED`). A mock session must *not* be
   creatable through a real hirer's ordinary live link by an ordinary candidate.
   Concrete recommended mechanism:
   - The candidate landing/start flow accepts an explicit `test_mode: true`
     signal, but the API **only honors it when `TEST_MODE_ENABLED=true`** in the
     backend environment (i.e. dev/staging), and otherwise ignores it and
     proceeds as a normal candidate. This makes it impossible to spawn mock rows
     in production.
   - If you want mock runs to never touch a real role at all, the stronger
     variant is a **designated test role** the mock link resolves to. Confirm
     with the user which containment level they want; the plan below works for
     either — only the resolution in `/start` differs.
2. **Agent behavior:** prompt-swap over the *real* ElevenLabs voice pipe
   (recommended — still exercises real latency/voice, which was half the point),
   vs. a fully-scripted client stub (cheaper, deterministic, but tests less).
   Plan below assumes **prompt-swap**.

---

## Implementation steps

### 1. Migration — add `is_mock` to `assessments`

New file `supabase/migrations/041_assessments_test_mode.sql` (follow the style of
`040_assessments_invite_expiry.sql`):

- `ALTER TABLE assessments ADD COLUMN is_mock boolean NOT NULL DEFAULT false;`
- Add an index if you plan to filter aggregates on it:
  `CREATE INDEX ... ON assessments (role_id, is_mock);`
- RLS: `is_mock` is server-written only. Confirm the candidate-write lockdown
  from `039_assessments_lock_down_candidate_writes.sql` already prevents
  candidates from setting it; if candidate inserts are still allowed for any
  column, ensure `is_mock` is not client-settable.

### 2. Backend — stamp the flag at entry

[`api.py:533`](api.py) `start_assessment`:

- Extend `StartAssessmentRequest` (find its model near the top of `api.py`) with
  an optional `test_mode: bool = False`.
- Compute `is_mock = bool(body.test_mode) and TEST_MODE_ENABLED` where
  `TEST_MODE_ENABLED` is read from env (add near the other env reads at the top
  of `api.py`). **Never** trust the client alone.
- Pass `"is_mock": is_mock` into the `create_assessment({...})` dict at
  `api.py:579`. No change needed in `create_assessment` itself
  ([`core/db.py:146`](core/db.py)) — it inserts the dict as-is.

### 3. Backend — swap the prompt for mock sessions

The interview prompt is served **server-side** at the ElevenLabs conversation
init webhook [`api.py:762`](api.py) `/elevenlabs/conv-init`, keyed off the signed
session token minted at [`api.py:168`](api.py) `_mint_session_prompt_token`. This
is the right place — the browser never sees or chooses the prompt.

- In `/elevenlabs/conv-init`, after resolving `assessment_id` → assessment row,
  read `assessment["is_mock"]`.
- If mock, return a short **small-talk system prompt** instead of the real
  `assemble_interview_prompt(...)` output. The small-talk prompt should:
  friendly chit-chat, ask nothing evaluative, and wrap up after ~1–2 exchanges.
  Keep it as a constant or a new `prompts/test_mode_smalltalk.yaml` following the
  existing `prompts/*.yaml` convention.
- Also check `assemble_interview_prompt` is not separately surfaced to the client
  anywhere for mock (the `/start` return at `api.py:603-608` computes
  `full_prompt` but does not return it — good; leave as is).

### 4. Backend — skip report generation for mock

Reports are triggered in **two** places, both via
`asyncio.create_task(generate_reports(...))`:

- [`api.py:1398`](api.py) in `/assess/{token}/finalize`
- [`api.py:1440`](api.py) in `/assess/{token}/complete`

In **both**, guard the trigger:

```
if not assessment.get("is_mock"):
    asyncio.create_task(generate_reports(...))
```

Confirm both handlers already load the assessment row (they reference
`assessment_id`); if one doesn't have the row in scope, fetch it via
`get_assessment(assessment_id)` first. The completion screen transition must
still fire for mock — only the report job is skipped, so nothing lands in the
`reports` table and no `dimension_scores` are written.

### 5. Frontend — carry `test_mode` from the entry flow to `/start`

Trace the onboarding call that POSTs to `/assess/{token}/start` (candidate portal
under `web/app/assess/[token]/`). Thread a `test_mode` boolean through to that
POST body. It should originate only from the deliberate Test Mode entry (per the
containment decision), not from any field a normal candidate sees. The backend
gate is the real guard; the frontend just forwards intent.

### 6. Frontend — make mock candidates unmistakable in the dashboard

All in [`web/app/dashboard/roles/[id]/page.tsx`](web/app/dashboard/roles/[id]/page.tsx):

- The `select` at `page.tsx:34` uses `*`, so `is_mock` comes back automatically.
- **Pin to bottom:** after the fetch (`page.tsx:32-36`), stably sort the
  `assessments` array so `is_mock === true` rows sink below all real rows,
  preserving `created_at` order within each group. (The DB `.order` can't express
  "mock last"; do it in JS.)
- **TEST badge:** next to the status pill at `page.tsx:159`, render a distinct
  "TEST" badge when `a.is_mock` — a separate marker, *not* a status value, so it
  can't be read as `in_progress`/`completed`.
- **Muted row + no data affordances:** grey the row; suppress the score chips
  (`page.tsx:164-171`) and any "View report" control for mock rows (they'll be
  empty anyway since steps 3–4 write no scores/reports — make the empty state
  read "TEST — no data", not a blank pending row).
- **Aggregates:** if the dashboard shows any "N candidates" tally, exclude
  `is_mock` rows so testers never skew counts.

---

## Containment summary (the safety story)

- Mock-ness is decided **once, server-side, at `/start`**, gated by
  `TEST_MODE_ENABLED`, stored on the row as `is_mock`.
- The prompt swap and report skip both **read that stored flag** — a tampered
  browser cannot turn a real interview into a mock one, nor vice versa.
- Wherever a mock row surfaces it is a greyed, "TEST"-badged, score-less row
  pinned to the bottom — impossible to mistake for a real candidate.

## Test checklist

- [ ] With `TEST_MODE_ENABLED=false`, a `test_mode:true` `/start` body produces a
      **normal** (non-mock) assessment — the gate holds.
- [ ] With it enabled, full journey completes: CV upload → small-talk interview →
      completion screen, and **no** `reports` / `dimension_scores` rows are
      created for that assessment.
- [ ] `/elevenlabs/conv-init` returns the small-talk prompt for a mock session
      and the real prompt for a normal one.
- [ ] Dashboard: the mock candidate is bottom-pinned, greyed, "TEST"-badged, with
      no score chips and no report link; real candidates are unaffected.
- [ ] Existing report tests still pass (the redesign in the latest commit —
      `027eb33` — touched report tests; don't regress them).
