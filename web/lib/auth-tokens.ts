// ENG-60: peppered SHA-256 hashing for auth tokens stored at rest.
//
// DSAR verification tokens and org invitation tokens are minted as
// 32-byte URL-safe blobs and emailed to the recipient. We never need
// the plaintext on the server again — only to verify it on inbound
// click. Storing the hash + a server-side pepper means a read-only DB
// breach can't be turned into mass token forgery.
//
// The pepper is read from TOKEN_HASH_PEPPER. If unset (dev/test) we
// fall back to a plain SHA-256 so the flow still works locally; in
// production the env var MUST be set or DB-side hashes won't match
// across deploys.

import crypto from 'crypto'

export function hashAuthToken(token: string): string {
  const pepper = process.env.TOKEN_HASH_PEPPER || ''
  if (!pepper) {
    return crypto.createHash('sha256').update(token).digest('hex')
  }
  return crypto.createHmac('sha256', pepper).update(token).digest('hex')
}
