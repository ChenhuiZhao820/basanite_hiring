import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getUserMock = vi.fn()
const roleSingleMock = vi.fn()
const allowMock = vi.fn()
const fetchMock = vi.fn()

vi.mock('@/lib/rate-limit', () => ({ allow: allowMock }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: getUserMock } }),
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ single: roleSingleMock }),
        }),
      }),
    }),
  }),
}))

function makeRequest(body: any) {
  return new Request('https://test/api/roles/r-1/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const params = { params: Promise.resolve({ id: 'r-1' }) }

describe('POST /api/roles/[id]/invite', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    allowMock.mockResolvedValue(true)
    getUserMock.mockResolvedValue({ data: { user: { id: 'hirer-1' } } })
    roleSingleMock.mockResolvedValue({ data: { id: 'r-1' }, error: null })
    fetchMock.mockResolvedValue({
      status: 200,
      json: async () => ({
        assessment_id: 'a-1',
        invite_url: 'https://basanite.co.uk/assess/invite/tok',
        invite_sent: true,
        candidate_email: 'jane@example.com',
      }),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('rejects unauthenticated requests with 401', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ candidate_name: 'Jane', candidate_email: 'jane@example.com' }) as any, params as any)
    expect(res.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('404s when the caller does not own the role', async () => {
    roleSingleMock.mockResolvedValue({ data: null, error: { message: 'not found' } })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ candidate_name: 'Jane', candidate_email: 'jane@example.com' }) as any, params as any)
    expect(res.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a missing candidate name with 400', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ candidate_name: '  ', candidate_email: 'jane@example.com' }) as any, params as any)
    expect(res.status).toBe(400)
  })

  it('rejects malformed emails with 400', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ candidate_name: 'Jane', candidate_email: 'not-an-email' }) as any, params as any)
    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('429s when the per-hirer rate limit is exhausted', async () => {
    allowMock.mockResolvedValue(false)
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ candidate_name: 'Jane', candidate_email: 'jane@example.com' }) as any, params as any)
    expect(res.status).toBe(429)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('proxies the authenticated user id to the backend on the happy path', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ candidate_name: 'Jane', candidate_email: 'jane@example.com' }) as any, params as any)
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/roles/r-1/invite')
    const sent = JSON.parse(init.body)
    expect(sent.user_id).toBe('hirer-1')
    expect(sent.candidate_email).toBe('jane@example.com')
    const data = await res.json()
    expect(data.invite_url).toContain('/assess/invite/')
  })

  it('passes backend error statuses through', async () => {
    fetchMock.mockResolvedValue({
      status: 409,
      json: async () => ({ detail: 'already interviewed' }),
    })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ candidate_name: 'Jane', candidate_email: 'jane@example.com' }) as any, params as any)
    expect(res.status).toBe(409)
  })
})
