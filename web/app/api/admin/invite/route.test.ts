import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getUserMock = vi.fn()
const upsertSelectSingleMock = vi.fn()
const inviteUserByEmailMock = vi.fn()
const generateLinkMock = vi.fn()
const updateUserByIdMock = vi.fn()
const allowMock = vi.fn()

vi.mock('@/lib/rate-limit', () => ({ allow: allowMock }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: getUserMock } }),
  createServiceClient: () => ({
    from: () => ({
      upsert: () => ({
        select: () => ({ single: upsertSelectSingleMock }),
      }),
    }),
    auth: {
      admin: {
        inviteUserByEmail: inviteUserByEmailMock,
        generateLink: generateLinkMock,
        updateUserById: updateUserByIdMock,
      },
    },
  }),
}))

function makeRequest(body: any) {
  return new Request('https://test/api/admin/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/invite', () => {
  beforeEach(() => {
    allowMock.mockResolvedValue(true)
    upsertSelectSingleMock.mockResolvedValue({ data: { id: 'wl-1' }, error: null })
    inviteUserByEmailMock.mockResolvedValue({
      data: { user: { id: 'u-1', app_metadata: {} } },
      error: null,
    })
    generateLinkMock.mockResolvedValue({
      data: { user: { id: 'u-1', app_metadata: {} }, properties: { action_link: 'https://link' } },
      error: null,
    })
    updateUserByIdMock.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated requests with 403', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: 'a@b.co' }) as any)
    expect(res.status).toBe(403)
  })

  it('rejects non-admin users with 403', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u', app_metadata: { is_admin: false } } } })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: 'a@b.co' }) as any)
    expect(res.status).toBe(403)
  })

  it('rejects malformed emails with 400', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'a', app_metadata: { is_admin: true } } } })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: 'not-an-email' }) as any)
    expect(res.status).toBe(400)
  })

  it('rejects requests when rate-limit is exhausted', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'a', app_metadata: { is_admin: true } } } })
    allowMock.mockResolvedValue(false)
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: 'a@b.co' }) as any)
    expect(res.status).toBe(429)
  })

  it('sends an invite and tags as hirer on the happy path', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'a', app_metadata: { is_admin: true } } } })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: 'Test@Example.COM', name: 'T' }) as any)
    expect(res.status).toBe(200)
    expect(inviteUserByEmailMock).toHaveBeenCalled()
    // Email is lower-cased.
    expect(inviteUserByEmailMock.mock.calls[0][0]).toBe('test@example.com')
    expect(updateUserByIdMock).toHaveBeenCalledWith('u-1', expect.objectContaining({
      app_metadata: expect.objectContaining({ role: 'hirer' }),
    }))
    const data = await res.json()
    expect(data.mode).toBe('invited')
  })

  it('falls back to magic link when the user is already registered', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'a', app_metadata: { is_admin: true } } } })
    inviteUserByEmailMock.mockResolvedValue({
      data: null,
      error: { message: 'User already registered', status: 422 },
    })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: 'existing@example.com' }) as any)
    expect(res.status).toBe(200)
    expect(generateLinkMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'magiclink',
      email: 'existing@example.com',
    }))
    const data = await res.json()
    expect(data.mode).toBe('magic_link')
  })

  it('returns 500 with the upstream message when invite genuinely fails', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'a', app_metadata: { is_admin: true } } } })
    inviteUserByEmailMock.mockResolvedValue({
      data: null,
      error: { message: 'SMTP relay refused', status: 500 },
    })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: 'a@b.co' }) as any)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toContain('SMTP relay refused')
  })

  it('returns 500 if the waitlist upsert fails', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'a', app_metadata: { is_admin: true } } } })
    upsertSelectSingleMock.mockResolvedValue({
      data: null,
      error: { message: 'unique violation', code: '23505' },
    })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: 'a@b.co' }) as any)
    expect(res.status).toBe(500)
  })

  it('does not re-tag a user that is already a hirer', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'a', app_metadata: { is_admin: true } } } })
    inviteUserByEmailMock.mockResolvedValue({
      data: { user: { id: 'u-2', app_metadata: { role: 'hirer' } } },
      error: null,
    })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: 'a@b.co' }) as any)
    expect(res.status).toBe(200)
    expect(updateUserByIdMock).not.toHaveBeenCalled()
  })
})
