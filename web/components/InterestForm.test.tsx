import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { InterestForm } from './InterestForm'

function mockFetch(response: { ok: boolean; status?: number; body?: unknown }) {
  const fn = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    json: async () => response.body ?? {},
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

async function fillAndSubmit(opts?: {
  name?: string
  email?: string
  company?: string
  phone?: string
  persona?: string | null
  referral?: string | RegExp
}) {
  const name = opts?.name ?? 'Ada Lovelace'
  const email = opts?.email ?? 'ada@example.com'
  const persona = opts?.persona === undefined ? /i hire people/i : opts.persona
  if (persona) await userEvent.click(screen.getByRole('radio', { name: persona }))
  if (name) await userEvent.type(screen.getByPlaceholderText(/your name/i), name)
  if (email) await userEvent.type(screen.getByPlaceholderText(/work email/i), email)
  if (opts?.phone) await userEvent.type(screen.getByPlaceholderText(/phone/i), opts.phone)
  if (opts?.company) await userEvent.type(screen.getByPlaceholderText(/company/i), opts.company)
  if (opts?.referral) await userEvent.click(screen.getByRole('button', { name: opts.referral }))
  await userEvent.click(screen.getByRole('button', { name: /^register interest$/i }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('InterestForm', () => {
  it('renders persona choices, all fields and a submit button', () => {
    render(<InterestForm />)
    expect(screen.getByRole('radio', { name: /i hire people/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /i interview people/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /i'm a candidate/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/work email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/phone/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/company/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /word of mouth/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^register interest$/i })).toBeInTheDocument()
  })

  it('shows a validation error without calling the API when no persona is picked', async () => {
    const fetchMock = mockFetch({ ok: true })
    render(<InterestForm />)
    await fillAndSubmit({ persona: null })
    expect(screen.getByRole('alert')).toHaveTextContent(/describes you/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a validation error without calling the API when name is missing', async () => {
    const fetchMock = mockFetch({ ok: true })
    render(<InterestForm />)
    await fillAndSubmit({ name: '', email: 'ada@example.com' })
    expect(screen.getByRole('alert')).toHaveTextContent(/name/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a validation error without calling the API when email is invalid', async () => {
    const fetchMock = mockFetch({ ok: true })
    render(<InterestForm />)
    await fillAndSubmit({ email: 'not-an-email' })
    expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a validation error without calling the API when the phone number is bogus', async () => {
    const fetchMock = mockFetch({ ok: true })
    render(<InterestForm />)
    await fillAndSubmit({ phone: 'abc' })
    expect(screen.getByRole('alert')).toHaveTextContent(/phone number/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts to /api/waitlist and shows the confirmation on success', async () => {
    const fetchMock = mockFetch({ ok: true, body: { ok: true } })
    render(<InterestForm />)
    await fillAndSubmit({
      company: 'Analytical Engines Ltd',
      phone: '+44 20 7946 0958',
      referral: 'Word of mouth',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/waitlist',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          company: 'Analytical Engines Ltd',
          phone: '+44 20 7946 0958',
          referral_source: 'Word of mouth',
          persona: 'hirer',
        }),
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(/on the list/i)
  })

  it('reveals a free-text field when Other is selected and hides it again on deselect', async () => {
    render(<InterestForm />)
    expect(screen.queryByPlaceholderText(/where did you hear about us/i)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^other$/i }))
    expect(screen.getByPlaceholderText(/where did you hear about us/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^other$/i }))
    expect(screen.queryByPlaceholderText(/where did you hear about us/i)).not.toBeInTheDocument()
  })

  it('submits the Other detail as part of referral_source', async () => {
    const fetchMock = mockFetch({ ok: true, body: { ok: true } })
    render(<InterestForm />)
    await userEvent.click(screen.getByRole('radio', { name: /i hire people/i }))
    await userEvent.type(screen.getByPlaceholderText(/your name/i), 'Ada Lovelace')
    await userEvent.type(screen.getByPlaceholderText(/work email/i), 'ada@example.com')
    await userEvent.click(screen.getByRole('button', { name: /^other$/i }))
    await userEvent.type(
      screen.getByPlaceholderText(/where did you hear about us/i),
      'A friend at a conference',
    )
    await userEvent.click(screen.getByRole('button', { name: /^register interest$/i }))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/waitlist',
      expect.objectContaining({
        body: expect.stringContaining('"referral_source":"Other: A friend at a conference"'),
      }),
    )
  })

  it('submits plain "Other" when no detail is typed', async () => {
    const fetchMock = mockFetch({ ok: true, body: { ok: true } })
    render(<InterestForm />)
    await fillAndSubmit({ referral: /^other$/i })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/waitlist',
      expect.objectContaining({
        body: expect.stringContaining('"referral_source":"Other"'),
      }),
    )
  })

  it('surfaces the API error message on failure', async () => {
    mockFetch({ ok: false, status: 429, body: { error: 'Too many requests. Please try again in a little while.' } })
    render(<InterestForm />)
    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent(/too many requests/i)
  })

  it('shows a generic error when the request throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    render(<InterestForm />)
    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i)
  })
})
