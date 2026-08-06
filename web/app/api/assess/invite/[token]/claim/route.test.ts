import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getUserMock = vi.fn()
const allowMock = vi.fn()
const fetchMock = vi.fn()

vi.mock('@/lib/rate-limit', () => ({ allow: allowMock }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: getUserMock } }),
}))

function makeRequest() {
  return new Request('https://test/api/assess/invite/tok-1/claim', { method: 'POST' })
}

const params = { params: Promise.resolve({ token: 'tok-1' }) }

describe('POST /api/assess/invite/[token]/claim', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    allowMock.mockResolvedValue(true)
    getUserMock.mockResolvedValue({
      data: { user: { id: 'cand-1', email: 'jane@example.com' } },
    })
    fetchMock.mockResolvedValue({
      status: 200,
      json: async () => ({ assessment_id: 'a-1', role_token: 'role-tok', status: 'pending' }),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('rejects unauthenticated requests with 401', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    const { POST } = await import('./route')
    const res = await POST(makeRequest() as any, params as any)
    expect(res.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('429s when the per-user rate limit is exhausted', async () => {
    allowMock.mockResolvedValue(false)
    const { POST } = await import('./route')
    const res = await POST(makeRequest() as any, params as any)
    expect(res.status).toBe(429)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('forwards the AUTHENTICATED user id + email, never client input', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest() as any, params as any)
    expect(res.status).toBe(200)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/assess/invite/tok-1/claim')
    const sent = JSON.parse(init.body)
    expect(sent).toEqual({ user_id: 'cand-1', email: 'jane@example.com' })
  })

  it('passes backend email-mismatch 403 through', async () => {
    fetchMock.mockResolvedValue({
      status: 403,
      json: async () => ({ detail: 'This invite was sent to a different email address.' }),
    })
    const { POST } = await import('./route')
    const res = await POST(makeRequest() as any, params as any)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.detail).toContain('different email')
  })

  it('passes backend 404 (expired / unknown invite) through', async () => {
    fetchMock.mockResolvedValue({
      status: 404,
      json: async () => ({ detail: 'Invite not found' }),
    })
    const { POST } = await import('./route')
    const res = await POST(makeRequest() as any, params as any)
    expect(res.status).toBe(404)
  })
})
