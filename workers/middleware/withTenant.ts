/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 *
 * withTenant — Cloudflare Workers middleware that verifies the caller's
 * Supabase JWT, extracts `org_id`, and attaches it to the request.
 *
 * Invariants it enforces
 *   - No request reaches a business handler without a validated `orgId`.
 *   - The orgId on the resulting context is ALWAYS the JWT claim,
 *     NEVER a value from the request body / query / path.
 *   - Rejects with 401 (missing/invalid JWT) or 403 (no org claim).
 *
 * Intentionally self-contained — depends only on Web Crypto +
 * standard Request/Response. Drop-in for Hono, itty-router, or a
 * raw Workers fetch handler.
 */

/** The shape every authenticated handler receives. */
export interface TenantContext {
  userId: string
  orgId: string
  roles: readonly string[]
  email: string | null
  tokenExpiresAt: number
}

export interface WithTenantOptions {
  /** Base64url-encoded Supabase JWT secret (legacy HS256) or JWKS URL. */
  jwtSecret: string
  /** Accepted issuer — usually `https://<project>.supabase.co/auth/v1`. */
  issuer: string
  /** Optional leeway seconds for clock skew. Default 30. */
  leewaySeconds?: number
}

export class TenantAuthError extends Error {
  constructor(readonly status: 401 | 403, readonly code: string, message: string) {
    super(message)
    this.name = 'TenantAuthError'
  }
}

/** Base64url-decode (Workers-native).
 *  Allocates a fresh ArrayBuffer (not SharedArrayBuffer) so the result is
 *  assignable to Web Crypto's BufferSource type under strict TS settings. */
function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const buffer = new ArrayBuffer(bin.length)
  const out = new Uint8Array(buffer)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Constant-time comparison to avoid timing side-channels on the HMAC. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  return diff === 0
}

async function verifyHs256(
  token: string,
  secret: string,
): Promise<Record<string, unknown>> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new TenantAuthError(401, 'malformed', 'Malformed JWT')
  const [headerB64, payloadB64, sigB64] = parts as [string, string, string]
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify', 'sign'],
  )
  const signed = enc.encode(`${headerB64}.${payloadB64}`)
  const sigBytes = b64urlDecode(sigB64)
  const ok = await crypto.subtle.verify('HMAC', key, sigBytes, signed)
  if (!ok) throw new TenantAuthError(401, 'bad_signature', 'JWT signature invalid')

  // Extra belt-and-suspenders constant-time check on a recomputed HMAC.
  const mac = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, signed),
  )
  if (!timingSafeEqual(mac, sigBytes)) {
    throw new TenantAuthError(401, 'bad_signature', 'JWT signature invalid')
  }

  const payloadText = new TextDecoder().decode(b64urlDecode(payloadB64))
  return JSON.parse(payloadText) as Record<string, unknown>
}

function pickOrgId(claims: Record<string, unknown>): string | null {
  // Primary: app_metadata.org_id (Supabase)
  const app = claims.app_metadata as Record<string, unknown> | undefined
  if (app && typeof app.org_id === 'string' && app.org_id.length > 0) {
    return app.org_id
  }
  // Fallback: top-level `org_id` (e.g. custom IdP)
  if (typeof claims.org_id === 'string' && claims.org_id.length > 0) {
    return claims.org_id as string
  }
  return null
}

function pickRoles(claims: Record<string, unknown>): readonly string[] {
  const app = claims.app_metadata as Record<string, unknown> | undefined
  const fromApp = app?.roles
  if (Array.isArray(fromApp)) return fromApp.filter((r): r is string => typeof r === 'string')
  if (typeof claims.role === 'string') return [claims.role as string]
  return []
}

/**
 * Validates the Authorization header on `request` and returns a
 * TenantContext. Throws TenantAuthError on failure.
 */
export async function resolveTenant(
  request: Request,
  options: WithTenantOptions,
): Promise<TenantContext> {
  const auth = request.headers.get('authorization') ?? ''
  const m = /^Bearer\s+(.+)$/i.exec(auth)
  if (!m) {
    throw new TenantAuthError(401, 'missing_token', 'Missing bearer token')
  }
  const token = m[1] as string
  const claims = await verifyHs256(token, options.jwtSecret)

  // iss check
  if (typeof claims.iss === 'string' && claims.iss !== options.issuer) {
    throw new TenantAuthError(401, 'bad_issuer', 'JWT issuer mismatch')
  }
  // exp + nbf
  const now = Math.floor(Date.now() / 1000)
  const leeway = options.leewaySeconds ?? 30
  if (typeof claims.exp === 'number' && claims.exp + leeway < now) {
    throw new TenantAuthError(401, 'expired', 'JWT expired')
  }
  if (typeof claims.nbf === 'number' && claims.nbf - leeway > now) {
    throw new TenantAuthError(401, 'not_yet_valid', 'JWT not yet valid')
  }

  const userId = typeof claims.sub === 'string' ? claims.sub : null
  if (!userId) throw new TenantAuthError(401, 'no_subject', 'JWT missing sub')

  const orgId = pickOrgId(claims)
  if (!orgId) {
    throw new TenantAuthError(403, 'no_org_claim', 'No org_id claim on JWT')
  }

  return {
    userId,
    orgId,
    roles: pickRoles(claims),
    email: typeof claims.email === 'string' ? (claims.email as string) : null,
    tokenExpiresAt: typeof claims.exp === 'number' ? (claims.exp as number) : 0,
  }
}

/**
 * Middleware factory. Returns a function you can await at the top of
 * any Workers fetch handler. If valid, returns { ctx, response: null };
 * if invalid, returns { ctx: null, response: <preformatted 401/403> }.
 */
export function withTenant(options: WithTenantOptions) {
  return async function middleware(request: Request): Promise<
    | { ctx: TenantContext; response: null }
    | { ctx: null; response: Response }
  > {
    try {
      const ctx = await resolveTenant(request, options)
      return { ctx, response: null }
    } catch (err) {
      if (err instanceof TenantAuthError) {
        return {
          ctx: null,
          response: new Response(
            JSON.stringify({ error: err.code, message: err.message }),
            {
              status: err.status,
              headers: { 'content-type': 'application/json' },
            },
          ),
        }
      }
      return {
        ctx: null,
        response: new Response(
          JSON.stringify({ error: 'auth_failure', message: 'Authentication failed' }),
          { status: 401, headers: { 'content-type': 'application/json' } },
        ),
      }
    }
  }
}
