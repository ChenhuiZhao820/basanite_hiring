const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUUID(value: string): boolean {
  return UUID_RE.test(value)
}

/**
 * Accept only same-origin, single-slash paths as a post-auth redirect target.
 *
 * Rejects external URLs, protocol-relative URLs (`//evil.com`), scheme-prefixed
 * values (`javascript:`, `data:`), and bare strings — so `?next=` cannot be
 * weaponised to bounce a signed-in user to an attacker-controlled host.
 */
export function safeNext(value: string | null | undefined, fallback = '/dashboard'): string {
  if (typeof value !== 'string' || value.length === 0) return fallback
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//')) return fallback
  if (value.startsWith('/\\')) return fallback
  return value
}
