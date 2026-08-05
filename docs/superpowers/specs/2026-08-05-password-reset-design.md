# Password reset on sign-in — design

## Problem

The `/login` page has no way for a hirer to recover a forgotten password. The
underlying infrastructure for this already exists and is used by the
candidate-onboarding flow (`app/assess/[token]/onboard/page.tsx`):

- `POST /api/auth/forgot-password` — rate-limited proxy to
  `supabase.auth.resetPasswordForEmail()`. Always returns `{ ok: true }` to
  avoid leaking whether an account exists.
- `/set-password` — handles the recovery link (via `/auth/callback` or
  `/auth/confirm`) and lets the user set a new password. Already generic
  across user types; needs no changes.

What's missing is purely the hirer-facing entry point: a link from `/login`
and a page to collect the email address and trigger the send.

## Scope

In scope:
- Add a "Forgot password?" link on `/login`.
- Add a new `/forgot-password` page with an email form.

Out of scope (already built, unchanged):
- `/api/auth/forgot-password` route.
- `/set-password` page.
- `/auth/callback` and `/auth/confirm` handlers.

## Design

### `app/forgot-password/page.tsx` (new)

Client component, styled to match `/login` and `/set-password` (same
`earth-50` background, white card, `LogoMark`, gold-500 focus states).

- Single `email` input + submit button ("Send reset link").
- On submit, POSTs to `/api/auth/forgot-password`:
  ```ts
  await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      redirect_to: `${window.location.origin}/auth/callback?next=/set-password`,
    }),
  })
  ```
  This mirrors the existing call in the candidate onboard page exactly.
- Regardless of the fetch outcome (success or network error), the page shows
  one generic message: "If an account exists for that email, we've sent a
  password reset link." The API always returns `{ ok: true }` by design (to
  prevent account enumeration), so there is no success/failure branch to
  handle — a caught network error gets the same generic message, not a
  distinct error state.
- Basic client-side email format validation before submit (same regex-shaped
  check as the API's own validation), to catch obvious typos before hitting
  the network.
- "Back to sign in" link to `/login`.

### `app/login/page.tsx` (change)

Add a "Forgot password?" link next to the Password field label, pointing to
`/forgot-password`. No other changes to the existing form or its state.

## Data flow

1. User clicks "Forgot password?" on `/login` → `/forgot-password`.
2. User submits email → `POST /api/auth/forgot-password` (existing, unchanged).
3. User receives email, clicks link → `/auth/callback?next=/set-password`
   (existing, unchanged) → `/set-password` (existing, unchanged).
4. `/set-password` sets the new password and redirects to `/dashboard`.

## Error handling

- Client-side: malformed email is rejected before the fetch fires, same as
  the existing pattern in the onboard page.
- Network/API errors: swallowed, same generic message shown. This is
  intentional (mirrors existing behavior) — do not add a distinct error UI
  branch, as that would create a timing/response oracle for account
  enumeration.

## Testing

The repo currently has no page-level component tests (`/login` and
`/set-password` are both untested; the only existing frontend-adjacent tests
are two API route tests: `admin/invite` and `admin/generate-link`). This
change follows that precedent — no new test scaffolding is introduced.
Verification is manual: run `npm run dev`, exercise the `/login` →
`/forgot-password` → submit flow, confirm the generic message renders and
the "Back to sign in" link works, and confirm the "Forgot password?" link
appears correctly on `/login`.
