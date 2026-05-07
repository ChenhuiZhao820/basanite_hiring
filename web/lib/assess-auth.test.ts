/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest'

// `vi.mock` factories are hoisted above imports; use `vi.hoisted` so the mock
// state lives in module scope and survives the hoist.
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  serviceQueueByTable: new Map<string, Array<{ data: unknown }>>(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
  createServiceClient: () => ({
    from(table: string) {
      const drain = async () =>
        mocks.serviceQueueByTable.get(table)?.shift() ?? { data: null }
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        single: drain,
      }
      return chain
    },
  }),
}))

import { assertCandidateOwnsAssessment, assertCandidateSession } from './assess-auth'

describe('assertCandidateOwnsAssessment', () => {
  beforeEach(() => {
    mocks.getUser.mockReset()
    mocks.serviceQueueByTable.clear()
  })

  it('returns 400 when assessmentId is missing', async () => {
    const out = await assertCandidateOwnsAssessment('tok', null)
    expect(out.error).toBeDefined()
    expect(out.error!.status).toBe(400)
  })

  it('returns 401 when user is not signed in', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const out = await assertCandidateOwnsAssessment('tok', 'aid')
    expect(out.error).toBeDefined()
    expect(out.error!.status).toBe(401)
  })

  it('returns 404 when role lookup misses', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.serviceQueueByTable.set('roles', [{ data: null }])
    const out = await assertCandidateOwnsAssessment('tok', 'aid')
    expect(out.error).toBeDefined()
    expect(out.error!.status).toBe(404)
  })

  it('returns 404 when assessment lookup misses', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.serviceQueueByTable.set('roles', [{ data: { id: 'r1' } }])
    mocks.serviceQueueByTable.set('assessments', [{ data: null }])
    const out = await assertCandidateOwnsAssessment('tok', 'aid')
    expect(out.error).toBeDefined()
    expect(out.error!.status).toBe(404)
  })

  it('returns user/role/assessment on success', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.serviceQueueByTable.set('roles', [{ data: { id: 'r1' } }])
    mocks.serviceQueueByTable.set('assessments', [{ data: { id: 'aid' } }])
    const out = await assertCandidateOwnsAssessment('tok', 'aid')
    expect(out.error).toBeUndefined()
    expect(out.user).toEqual({ id: 'u1' })
    expect(out.role).toEqual({ id: 'r1' })
    expect(out.assessment).toEqual({ id: 'aid' })
  })
})

describe('assertCandidateSession', () => {
  beforeEach(() => {
    mocks.getUser.mockReset()
    mocks.serviceQueueByTable.clear()
  })

  it('returns 401 when user is not signed in', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const out = await assertCandidateSession('tok')
    expect(out.error).toBeDefined()
    expect(out.error!.status).toBe(401)
  })

  it('returns 404 when role missing', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.serviceQueueByTable.set('roles', [{ data: null }])
    const out = await assertCandidateSession('tok')
    expect(out.error).toBeDefined()
    expect(out.error!.status).toBe(404)
  })

  it('returns user and role on success', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.serviceQueueByTable.set('roles', [{ data: { id: 'r1' } }])
    const out = await assertCandidateSession('tok')
    expect(out.error).toBeUndefined()
    expect(out.user).toEqual({ id: 'u1' })
    expect(out.role).toEqual({ id: 'r1' })
  })
})
