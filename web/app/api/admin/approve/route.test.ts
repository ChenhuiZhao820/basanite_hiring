import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getUserMock = vi.fn()
const selectSingleMock = vi.fn()
const updateEqMock = vi.fn()
const inviteUserByEmailMock = vi.fn()
const updateUserByIdMock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: getUserMock } }),
  createServiceClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: selectSingleMock }) }),
      update: () => ({ eq: updateEqMock }),
    }),
    auth: {
      admin: {
        inviteUserByEmail: inviteUserByEmailMock,
        updateUserById: updateUserByIdMock,
      },
    },
  }),
}))

function makeRequest(body: any) {
  return new Request('https://test/api/admin/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const admin = { data: { user: { id: 'a', app_metadata: { is_admin: true } } } }

describe('POST /api/admin/approve', () => {
  beforeEach(() => {
    getUserMock.mockResolvedValue(admin)
    selectSingleMock.mockResolvedValue({ data: { email: 'p@x.co', persona: 'hirer' } })
    updateEqMock.mockResolvedValue({ error: null })
    inviteUserByEmailMock.mockResolvedValue({
      data: { user: { id: 'u-1', app_metadata: {} } },
      error: null,
    })
    updateUserByIdMock.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('rejects non-admin users with 403', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u', app_metadata: {} } } })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ id: 'wl-1', email: 'p@x.co' }) as any)
    expect(res.status).toBe(403)
  })

  it('returns 404 when the waitlist email does not match', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ id: 'wl-1', email: 'other@x.co' }) as any)
    expect(res.status).toBe(404)
    expect(inviteUserByEmailMock).not.toHaveBeenCalled()
  })

  it('tags a hirer-persona entry as hirer', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ id: 'wl-1', email: 'p@x.co' }) as any)
    expect(res.status).toBe(200)
    expect(updateUserByIdMock).toHaveBeenCalledWith('u-1', expect.objectContaining({
      app_metadata: expect.objectContaining({ role: 'hirer' }),
    }))
  })

  it('tags a candidate-persona entry as candidate with is_candidate', async () => {
    selectSingleMock.mockResolvedValue({ data: { email: 'p@x.co', persona: 'candidate' } })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ id: 'wl-1', email: 'p@x.co' }) as any)
    expect(res.status).toBe(200)
    expect(updateUserByIdMock).toHaveBeenCalledWith('u-1', expect.objectContaining({
      app_metadata: expect.objectContaining({ role: 'candidate', is_candidate: true }),
    }))
  })

  it('tags entries with no persona as hirer (pre-049 rows)', async () => {
    selectSingleMock.mockResolvedValue({ data: { email: 'p@x.co', persona: null } })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ id: 'wl-1', email: 'p@x.co' }) as any)
    expect(res.status).toBe(200)
    expect(updateUserByIdMock).toHaveBeenCalledWith('u-1', expect.objectContaining({
      app_metadata: expect.objectContaining({ role: 'hirer' }),
    }))
  })

  it('never downgrades an existing hirer to candidate', async () => {
    selectSingleMock.mockResolvedValue({ data: { email: 'p@x.co', persona: 'candidate' } })
    inviteUserByEmailMock.mockResolvedValue({
      data: { user: { id: 'u-2', app_metadata: { role: 'hirer' } } },
      error: null,
    })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ id: 'wl-1', email: 'p@x.co' }) as any)
    expect(res.status).toBe(200)
    expect(updateUserByIdMock).not.toHaveBeenCalled()
  })

  it('does not re-tag a user that already has the target role', async () => {
    selectSingleMock.mockResolvedValue({ data: { email: 'p@x.co', persona: 'candidate' } })
    inviteUserByEmailMock.mockResolvedValue({
      data: { user: { id: 'u-3', app_metadata: { role: 'candidate', is_candidate: true } } },
      error: null,
    })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ id: 'wl-1', email: 'p@x.co' }) as any)
    expect(res.status).toBe(200)
    expect(updateUserByIdMock).not.toHaveBeenCalled()
  })

  it('marks the waitlist row approved', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ id: 'wl-1', email: 'p@x.co' }) as any)
    expect(res.status).toBe(200)
    expect(updateEqMock).toHaveBeenCalled()
  })

  it('returns 500 when the invite genuinely fails', async () => {
    inviteUserByEmailMock.mockResolvedValue({
      data: null,
      error: { message: 'SMTP relay refused' },
    })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ id: 'wl-1', email: 'p@x.co' }) as any)
    expect(res.status).toBe(500)
  })
})
