import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const listUsersMock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    auth: { admin: { listUsers: listUsersMock } },
  }),
}))

const fetchMock = vi.fn()

function lastSendPayload() {
  const [, init] = fetchMock.mock.calls[0]
  return JSON.parse(init.body as string)
}

describe('sendAdminNotification', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({ ok: true, status: 200 })
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    vi.stubEnv('RESEND_FROM', 'Basanite <alerts@basanite.co.uk>')
    vi.stubEnv('ADMIN_NOTIFY_TO', '')
    vi.stubEnv('OPS_ALERT_TO', '')
    listUsersMock.mockResolvedValue({
      data: {
        users: [
          { id: 'u1', email: 'admin@basanite.co.uk', app_metadata: { is_admin: true } },
          { id: 'u2', email: 'hirer@acme.com', app_metadata: {} },
          { id: 'u3', email: 'second-admin@basanite.co.uk', app_metadata: { is_admin: true } },
        ],
      },
      error: null,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('returns false and logs loudly when RESEND_API_KEY is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { sendAdminNotification } = await import('./admin-notify')
    const ok = await sendAdminNotification('Test', ['line'])
    expect(ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('RESEND_API_KEY'))
    errorSpy.mockRestore()
  })

  it('sends to ADMIN_NOTIFY_TO recipients when set (overrides admin lookup)', async () => {
    vi.stubEnv('ADMIN_NOTIFY_TO', 'a@x.com, b@y.com')
    const { sendAdminNotification } = await import('./admin-notify')
    const ok = await sendAdminNotification('Test', ['line'])
    expect(ok).toBe(true)
    expect(lastSendPayload().to).toEqual(['a@x.com', 'b@y.com'])
  })

  it('falls back to OPS_ALERT_TO when ADMIN_NOTIFY_TO is unset', async () => {
    vi.stubEnv('OPS_ALERT_TO', 'ops@basanite.co.uk')
    const { sendAdminNotification } = await import('./admin-notify')
    const ok = await sendAdminNotification('Test', ['line'])
    expect(ok).toBe(true)
    expect(lastSendPayload().to).toEqual(['ops@basanite.co.uk'])
  })

  it('defaults to emailing every admin account when no env recipients are set', async () => {
    const { sendAdminNotification } = await import('./admin-notify')
    const ok = await sendAdminNotification('Test', ['line'])
    expect(ok).toBe(true)
    expect(listUsersMock).toHaveBeenCalled()
    expect(lastSendPayload().to).toEqual([
      'admin@basanite.co.uk',
      'second-admin@basanite.co.uk',
    ])
  })

  it('excludes admins who switched email notifications off', async () => {
    listUsersMock.mockResolvedValue({
      data: {
        users: [
          { id: 'u1', email: 'admin@basanite.co.uk', app_metadata: { is_admin: true } },
          { id: 'u3', email: 'second-admin@basanite.co.uk', app_metadata: { is_admin: true, admin_notifications_disabled: true } },
        ],
      },
      error: null,
    })
    const { sendAdminNotification } = await import('./admin-notify')
    const ok = await sendAdminNotification('Test', ['line'])
    expect(ok).toBe(true)
    expect(lastSendPayload().to).toEqual(['admin@basanite.co.uk'])
  })

  it('excludes env-configured recipients whose account opted out', async () => {
    vi.stubEnv('ADMIN_NOTIFY_TO', 'Admin@Basanite.co.uk, external@x.com')
    listUsersMock.mockResolvedValue({
      data: {
        users: [
          { id: 'u1', email: 'admin@basanite.co.uk', app_metadata: { is_admin: true, admin_notifications_disabled: true } },
        ],
      },
      error: null,
    })
    const { sendAdminNotification } = await import('./admin-notify')
    const ok = await sendAdminNotification('Test', ['line'])
    expect(ok).toBe(true)
    expect(lastSendPayload().to).toEqual(['external@x.com'])
  })

  it('still sends to env recipients unfiltered when the admin lookup errors', async () => {
    vi.stubEnv('ADMIN_NOTIFY_TO', 'a@x.com')
    listUsersMock.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { sendAdminNotification } = await import('./admin-notify')
    const ok = await sendAdminNotification('Test', ['line'])
    expect(ok).toBe(true)
    expect(lastSendPayload().to).toEqual(['a@x.com'])
    errorSpy.mockRestore()
  })

  it('tells recipients how to turn notifications off', async () => {
    const { sendAdminNotification } = await import('./admin-notify')
    await sendAdminNotification('Test', ['line'])
    const html = lastSendPayload().html as string
    expect(html).toContain('https://basanite.co.uk/dashboard/admin')
    expect(html).toContain('Email notifications')
  })

  it('returns false and logs loudly when no recipients can be resolved', async () => {
    listUsersMock.mockResolvedValue({ data: { users: [] }, error: null })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { sendAdminNotification } = await import('./admin-notify')
    const ok = await sendAdminNotification('Test', ['line'])
    expect(ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('no recipients'))
    errorSpy.mockRestore()
  })

  it('survives an admin lookup failure without throwing', async () => {
    listUsersMock.mockRejectedValue(new Error('network down'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { sendAdminNotification } = await import('./admin-notify')
    const ok = await sendAdminNotification('Test', ['line'])
    expect(ok).toBe(false)
    errorSpy.mockRestore()
  })

  it('escapes HTML in subject and body lines', async () => {
    const { sendAdminNotification } = await import('./admin-notify')
    await sendAdminNotification('<b>Subject</b>', ['<script>alert(1)</script>'])
    const payload = lastSendPayload()
    expect(payload.html).not.toContain('<script>')
    expect(payload.html).toContain('&lt;script&gt;')
  })

  it('warns when using the Resend sandbox sender', async () => {
    vi.stubEnv('RESEND_FROM', 'Basanite <onboarding@resend.dev>')
    vi.stubEnv('ADMIN_NOTIFY_TO', 'a@x.com')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { sendAdminNotification } = await import('./admin-notify')
    await sendAdminNotification('Test', ['line'])
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sandbox'))
    warnSpy.mockRestore()
  })
})
