/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 *
 * withTenant middleware tests — HS256 path.
 * Runs under vitest with the default Node environment (uses Web Crypto
 * polyfill from Node >=19, which we target in CI).
 */
import { describe, expect, it, beforeAll } from 'vitest'
import { resolveTenant, TenantAuthError, withTenant } from '../withTenant'

// --- helpers ----------------------------------------------------------
const SECRET = 'super-secret-signing-key-for-unit-tests'
const ISSUER = 'https://test.supabase.co/auth/v1'

function b64url(input: ArrayBuffer | Uint8Array | string): string {
  const bytes =
    typeof input === 'string'
      ? new TextEncoder().encode(input)
      : input instanceof Uint8Array
        ? input
        : new Uint8Array(input)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function mintJwt(payload: Record<string, unknown>, secret = SECRET) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const h = b64url(JSON.stringify(header))
  const p = b64url(JSON.stringify(payload))
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${h}.${p}`)),
  )
  return `${h}.${p}.${b64url(sig)}`
}

function reqWithJwt(jwt: string) {
  return new Request('https://example.com/api/thing', {
    headers: { authorization: `Bearer ${jwt}` },
  })
}

// --- tests ------------------------------------------------------------
describe('resolveTenant', () => {
  let validJwt: string
  const now = Math.floor(Date.now() / 1000)

  beforeAll(async () => {
    validJwt = await mintJwt({
      sub: 'user-123',
      iss: ISSUER,
      exp: now + 3600,
      email: 'alice@example.com',
      app_metadata: { org_id: 'org-11111111', roles: ['ciso'] },
    })
  })

  it('accepts a well-formed JWT with org_id claim (happy path)', async () => {
    const ctx = await resolveTenant(reqWithJwt(validJwt), {
      jwtSecret: SECRET,
      issuer: ISSUER,
    })
    expect(ctx.userId).toBe('user-123')
    expect(ctx.orgId).toBe('org-11111111')
    expect(ctx.roles).toEqual(['ciso'])
    expect(ctx.email).toBe('alice@example.com')
  })

  it('rejects a JWT missing the Authorization header (edge)', async () => {
    const req = new Request('https://example.com/api/thing')
    await expect(
      resolveTenant(req, { jwtSecret: SECRET, issuer: ISSUER }),
    ).rejects.toThrow(TenantAuthError)
  })

  it('rejects an expired JWT (edge)', async () => {
    const expired = await mintJwt({
      sub: 'user-123',
      iss: ISSUER,
      exp: now - 3600,
      app_metadata: { org_id: 'org-1' },
    })
    await expect(
      resolveTenant(reqWithJwt(expired), { jwtSecret: SECRET, issuer: ISSUER }),
    ).rejects.toMatchObject({ code: 'expired', status: 401 })
  })

  it('rejects a JWT with no org_id claim (SECURITY: tenant bypass)', async () => {
    const noOrg = await mintJwt({
      sub: 'user-123',
      iss: ISSUER,
      exp: now + 3600,
      app_metadata: { roles: ['admin'] },
    })
    await expect(
      resolveTenant(reqWithJwt(noOrg), { jwtSecret: SECRET, issuer: ISSUER }),
    ).rejects.toMatchObject({ code: 'no_org_claim', status: 403 })
  })

  it('rejects a JWT signed with a different secret (SECURITY: forgery)', async () => {
    const forged = await mintJwt(
      { sub: 'user-123', iss: ISSUER, exp: now + 3600, app_metadata: { org_id: 'org-X' } },
      'attacker-guessed-secret',
    )
    await expect(
      resolveTenant(reqWithJwt(forged), { jwtSecret: SECRET, issuer: ISSUER }),
    ).rejects.toMatchObject({ code: 'bad_signature', status: 401 })
  })

  it('rejects a JWT with wrong issuer (SECURITY: mixed-environment reuse)', async () => {
    const wrongIss = await mintJwt({
      sub: 'user-123',
      iss: 'https://attacker.example.com',
      exp: now + 3600,
      app_metadata: { org_id: 'org-1' },
    })
    await expect(
      resolveTenant(reqWithJwt(wrongIss), { jwtSecret: SECRET, issuer: ISSUER }),
    ).rejects.toMatchObject({ code: 'bad_issuer', status: 401 })
  })
})

describe('withTenant factory', () => {
  it('returns a preformatted 401 Response on failure', async () => {
    const mw = withTenant({ jwtSecret: SECRET, issuer: ISSUER })
    const r = await mw(new Request('https://x/y'))
    expect(r.ctx).toBeNull()
    expect(r.response?.status).toBe(401)
    const body = (await r.response?.json()) as { error: string }
    expect(body.error).toBe('missing_token')
  })
})
