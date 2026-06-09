import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { AuthFragmentHandler } from './AuthFragmentHandler'

// Captured router calls per render; reset between cases via vi.clearAllMocks.
const replaceMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), refresh: vi.fn() }),
}))

// Each test installs its own resolver so we can assert the args
// `setSession` was called with AND control the resolved session shape.
const setSessionMock = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { setSession: setSessionMock },
  }),
}))

function setHash(hash: string) {
  // jsdom's location.hash is settable.
  window.history.replaceState(null, '', window.location.pathname + hash)
}

describe('AuthFragmentHandler', () => {
  afterEach(() => {
    vi.clearAllMocks()
    setHash('')
  })

  it('does nothing when the URL has no fragment', async () => {
    setHash('')
    render(<AuthFragmentHandler />)
    await new Promise(r => setTimeout(r, 10))
    expect(setSessionMock).not.toHaveBeenCalled()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('does nothing when the fragment lacks Supabase tokens', async () => {
    setHash('#section=anchor')
    render(<AuthFragmentHandler />)
    await new Promise(r => setTimeout(r, 10))
    expect(setSessionMock).not.toHaveBeenCalled()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('persists the session and routes magic-link sign-ins to /set-password', async () => {
    setSessionMock.mockResolvedValue({
      data: { session: { user: { app_metadata: { role: 'hirer' } } } },
      error: null,
    })
    setHash('#access_token=abc&refresh_token=xyz&type=magiclink')
    render(<AuthFragmentHandler />)
    await waitFor(() => expect(setSessionMock).toHaveBeenCalled())
    expect(setSessionMock).toHaveBeenCalledWith({
      access_token: 'abc',
      refresh_token: 'xyz',
    })
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/set-password'))
  })

  it('routes recovery and invite flows to /set-password too', async () => {
    setSessionMock.mockResolvedValue({
      data: { session: { user: { app_metadata: { role: 'hirer' } } } },
      error: null,
    })
    for (const flow of ['recovery', 'invite', 'signup']) {
      replaceMock.mockReset()
      setHash(`#access_token=a&refresh_token=r&type=${flow}`)
      render(<AuthFragmentHandler />)
      await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/set-password'))
    }
  })

  it('routes already-passworded users (no flow type) to /dashboard', async () => {
    setSessionMock.mockResolvedValue({
      data: { session: { user: { app_metadata: { role: 'hirer' } } } },
      error: null,
    })
    setHash('#access_token=a&refresh_token=r')
    render(<AuthFragmentHandler />)
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/dashboard'))
  })

  it('honours an explicit safe `next` param when Supabase preserved one', async () => {
    setSessionMock.mockResolvedValue({
      data: { session: { user: { app_metadata: { role: 'hirer' } } } },
      error: null,
    })
    setHash('#access_token=a&refresh_token=r&type=magiclink&next=%2Fdashboard%2Froles')
    render(<AuthFragmentHandler />)
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/dashboard/roles'))
  })

  it('refuses an open-redirect `next` value', async () => {
    setSessionMock.mockResolvedValue({
      data: { session: { user: { app_metadata: { role: 'hirer' } } } },
      error: null,
    })
    setHash('#access_token=a&refresh_token=r&type=magiclink&next=https%3A%2F%2Fevil.com')
    render(<AuthFragmentHandler />)
    // safeNext rejects external URLs; the per-flow fallback wins.
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/set-password'))
  })

  it('routes candidates away from the hirer dashboard', async () => {
    setSessionMock.mockResolvedValue({
      data: { session: { user: { app_metadata: { is_candidate: true } } } },
      error: null,
    })
    setHash('#access_token=a&refresh_token=r&type=magiclink')
    render(<AuthFragmentHandler />)
    // Candidates have a different sign-in path; if one lands here we
    // bounce them back to / rather than into the hirer set-password flow.
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/'))
  })

  it('sends invalid-token errors to /login with a friendly message', async () => {
    setSessionMock.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid token', code: 'invalid_token' },
    })
    setHash('#access_token=bad&refresh_token=alsobad&type=magiclink')
    render(<AuthFragmentHandler />)
    await waitFor(() => {
      const target = replaceMock.mock.calls.at(-1)?.[0] as string | undefined
      expect(target).toBeDefined()
      expect(target!).toMatch(/^\/login\?error=/)
      expect(target!).toContain('no%20longer%20valid')
    })
  })

  it('catches setSession promise rejections without throwing', async () => {
    setSessionMock.mockRejectedValue(new Error('network down'))
    setHash('#access_token=a&refresh_token=r&type=magiclink')
    render(<AuthFragmentHandler />)
    await waitFor(() => {
      const target = replaceMock.mock.calls.at(-1)?.[0] as string | undefined
      expect(target).toBeDefined()
      expect(target!).toMatch(/^\/login\?error=/)
    })
  })
})
