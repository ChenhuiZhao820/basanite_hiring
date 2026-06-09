import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getUserMock = vi.fn()
const generateLinkMock = vi.fn()
const allowMock = vi.fn()

vi.mock('@/lib/rate-limit', () => ({ allow: allowMock }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: getUserMock } }),
  createServiceClient: () => ({
    auth: { admin: { generateLink: generateLinkMock } },
  }),
}))

function makeRequest(body: any) {
  return new Request('https://test/api/admin/generate-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/generate-link', () => {
  beforeEach(() => {
    allowMock.mockResolvedValue(true)
    generateLinkMock.mockResolvedValue({
      data: { properties: { action_link: 'https://supabase.example/auth/v1/verify?token=…' } },
      error: null,
    })
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

  it('rejects when rate-limit is exhausted', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'a', app_metadata: { is_admin: true } } } })
    allowMock.mockResolvedValue(false)
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: 'a@b.co' }) as any)
    expect(res.status).toBe(429)
  })

  it('returns a generated magic link on the happy path', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'a', app_metadata: { is_admin: true } } } })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: 'Test@Example.COM' }) as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.action_link).toContain('https://supabase.example')
    // Lower-cases the email and uses magiclink (not invite) so the call
    // works for already-registered users too.
    expect(generateLinkMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'magiclink',
      email: 'test@example.com',
    }))
  })

  it('returns 500 when Supabase generateLink fails', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'a', app_metadata: { is_admin: true } } } })
    generateLinkMock.mockResolvedValue({ data: null, error: { message: 'Out of quota' } })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: 'a@b.co' }) as any)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toContain('Out of quota')
  })

  it('returns 500 when Supabase returns no action_link', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'a', app_metadata: { is_admin: true } } } })
    generateLinkMock.mockResolvedValue({ data: { properties: {} }, error: null })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: 'a@b.co' }) as any)
    expect(res.status).toBe(500)
  })
})
