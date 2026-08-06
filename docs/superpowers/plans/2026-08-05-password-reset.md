# Password Reset on Sign-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a hirer who forgot their password request a reset link from `/login`, using password-reset infrastructure that already exists (`/api/auth/forgot-password`, `/set-password`, `/auth/callback`) but currently has no hirer-facing entry point.

**Architecture:** A new client-rendered page, `app/forgot-password/page.tsx`, collects an email address and POSTs it to the existing `/api/auth/forgot-password` route, then shows one static confirmation message regardless of outcome. `app/login/page.tsx` gets a one-line link to that new page. No new backend code, no new dependencies.

**Tech Stack:** Next.js 16 App Router, React 18 client components, Tailwind CSS (existing `earth-50` / `basanite-900` / `gold-500` / `gold-600` design tokens), Supabase JS client (already wired via `@/lib/supabase/client`).

## Global Constraints

- No backend/API changes — `/api/auth/forgot-password`, `/set-password`, `/auth/callback` are out of scope and must not be modified (per spec).
- The confirmation message must be identical whether the fetch succeeds, fails, or the email doesn't correspond to an account — no branching UI state on the response (prevents account enumeration; per spec's Error Handling section).
- No new test files — this repo has no page-level component tests today (`/login`, `/set-password` are both untested); verification is `npm run build` (type-checks the whole app) plus manual exercise of the flow via `npm run dev` (per spec's Testing section).
- Match existing visual style exactly: `bg-earth-50` page background, white card (`bg-white border border-slate-200 p-8`), `LogoMark` header block, `gold-500` focus rings, `basanite-900`/`gold-600` button, uppercase tracked-wide labels — copy these classes verbatim from `app/login/page.tsx`, do not invent new ones.

---

### Task 1: Add the `/forgot-password` page

**Files:**
- Create: `web/app/forgot-password/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/client` (not actually called — see note below; import only what's used), `LogoMark` from `@/components/Logo` (`{ size?: number; dark?: boolean }`), `useDocumentTitle` from `@/lib/useDocumentTitle` (`(pageTitle: string | undefined) => void`), existing route `POST /api/auth/forgot-password` (body `{ email: string; redirect_to?: string }`, always responds `{ ok: true }`, HTTP 200).
- Produces: route `/forgot-password`, linked from Task 2.

Note: unlike `/login`, this page does not need the Supabase client directly — it only calls the existing `/api/auth/forgot-password` REST route via `fetch`, exactly like `app/assess/[token]/onboard/page.tsx` does. Do not import `createClient` here.

- [ ] **Step 1: Write the page component**

```tsx
'use client'

import { useState } from 'react'
import { LogoMark } from '@/components/Logo'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordPage() {
  useDocumentTitle('Reset password')

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!EMAIL_RE.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    setLoading(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirect_to: `${window.location.origin}/auth/callback?next=/set-password`,
        }),
      })
    } catch {
      // Network error — fall through to the same generic message below.
      // Never surface upstream error details: the API always returns
      // { ok: true } by design so callers can't tell whether the account
      // exists, and a distinct error state here would defeat that.
    }
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-earth-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <a href="/" className="flex items-center gap-2 justify-center mb-10">
          <LogoMark size={28} dark />
          <span className="font-semibold text-[#1a1a18] text-base">Basanite</span>
        </a>

        <div className="bg-white border border-slate-200 p-8">
          <h1 className="font-display text-2xl font-bold text-basanite-900 mb-1">Reset password</h1>

          {sent ? (
            <p className="text-slate-500 text-sm mb-1">
              If an account exists for that email, we&apos;ve sent a password reset link. Check your inbox.
            </p>
          ) : (
            <>
              <p className="text-slate-500 text-sm mb-7">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full border border-slate-300 px-3 py-2.5 text-sm text-basanite-900 outline-none focus:border-gold-500 transition-colors"
                    placeholder="you@company.com"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-basanite-900 hover:bg-gold-600 text-white font-medium py-2.5 text-sm transition-colors duration-150 disabled:opacity-60"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center mt-5">
          <a href="/login" className="text-gold-600 hover:underline">
            Back to sign in
          </a>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check the build**

Run: `cd web && npm run build`
Expected: build succeeds with no TypeScript or Next.js errors. (This is the project's only automated check for page-level code — there is no separate lint script.)

- [ ] **Step 3: Manually verify the page**

Run: `cd web && npm run dev`, then in a browser visit `http://localhost:3000/forgot-password`.
Expected:
- Page renders with the Basanite logo, "Reset password" heading, and email form, visually matching `/login`'s card styling.
- Submitting an empty/invalid email (e.g. `notanemail`) shows "Enter a valid email address." and does not fire a network request (check the Network tab).
- Submitting a valid email (any address, real or not — e.g. `test@example.com`) shows the button change to "Sending…", then the form is replaced by "If an account exists for that email, we've sent a password reset link. Check your inbox." Confirm in the Network tab that a `POST /api/auth/forgot-password` request fired with the email and a `redirect_to` of `http://localhost:3000/auth/callback?next=/set-password`.
- "Back to sign in" link at the bottom navigates to `/login`.

- [ ] **Step 4: Commit**

```bash
cd /Users/adityashah/Documents/Basanite/basanite
git add web/app/forgot-password/page.tsx
git commit -m "feat: add forgot-password page"
```

---

### Task 2: Link to it from `/login`

**Files:**
- Modify: `web/app/login/page.tsx`

**Interfaces:**
- Consumes: route `/forgot-password` (produced by Task 1).
- Produces: nothing new consumed elsewhere.

- [ ] **Step 1: Add the link next to the Password label**

In `web/app/login/page.tsx`, find the Password field block:

```tsx
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={password}
```

Replace the label line with a flex row that adds the link, keeping every existing class and the input untouched:

```tsx
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Password
                </label>
                <a href="/forgot-password" className="text-xs text-gold-600 hover:underline">
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                value={password}
```

- [ ] **Step 2: Type-check the build**

Run: `cd web && npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 3: Manually verify**

Run: `cd web && npm run dev`, visit `http://localhost:3000/login`.
Expected:
- "Forgot password?" link appears at the top-right of the Password field, same row as the label.
- Clicking it navigates to `/forgot-password`.
- The rest of the login form (email/password inputs, submit, existing banners for `verified`/`deleted`/`urlError` query params) is visually unchanged — spot-check by loading `http://localhost:3000/login?verified=1` and confirming the green banner still renders above the card as before.

- [ ] **Step 4: Commit**

```bash
cd /Users/adityashah/Documents/Basanite/basanite
git add web/app/login/page.tsx
git commit -m "feat: link to forgot-password from sign-in"
```

---

### Task 3: Push the branch

**Files:** none (git operation only)

- [ ] **Step 1: Push `password-reset-feature` to origin**

```bash
cd /Users/adityashah/Documents/Basanite/basanite
git push -u origin password-reset-feature
```

Expected: branch created on `origin` (`ChenhuiZhao820/basanite_hiring`), tracking set up, output shows the new remote branch ref.
