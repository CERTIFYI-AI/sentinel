/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 * See LICENSE for details.
 *
 * sso-oidc-callback — handles the /authorize → /token → /userinfo redirect
 * tail of an OIDC login. Verifies the ID token signature against the IdP's
 * JWKS, extracts the subject + email, JIT-provisions the user, and
 * redirects the browser back to the dashboard with a Supabase magic-link
 * token.
 *
 * Standards: OpenID Connect Core 1.0, RFC 7519 (JWT), RFC 7517 (JWK Set).
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
 *   APP_BASE_URL          — e.g. https://sentinel.example.com
 */

// @ts-expect-error runtime
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  adminClient,
  corsHeaders,
  jitProvision,
  jsonResponse,
  logScimAudit,
} from '../_shared/sso.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: { env: { get(k: string): string | undefined } }

interface OidcConfig {
  issuer: string
  token_endpoint: string
  userinfo_endpoint?: string
  jwks_uri: string
  client_id: string
  client_secret: string
  redirect_uri: string
  group_claim_path?: string
}

interface IdTokenPayload {
  iss: string
  sub: string
  aud: string | string[]
  exp: number
  iat: number
  email?: string
  name?: string
  [key: string]: unknown
}

const SSO_STATE_SECRET = Deno.env.get('SSO_STATE_SECRET') ?? Deno.env.get('CRON_SECRET') ?? ''

function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const bin = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const buf = new ArrayBuffer(bin.length)
  const out = new Uint8Array(buf)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function verifyStateHmac(state: string): Promise<{ provider_id: string; nonce: string }> {
  const dot = state.lastIndexOf('.')
  if (dot < 0) throw new Error('state_no_sig')
  const payloadB64 = state.slice(0, dot)
  const sigB64 = state.slice(dot + 1)
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(SSO_STATE_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
  )
  const ok = await crypto.subtle.verify(
    'HMAC', key, b64urlDecode(sigB64), new TextEncoder().encode(payloadB64),
  )
  if (!ok) throw new Error('state_bad_sig')
  const decoded = JSON.parse(
    new TextDecoder().decode(b64urlDecode(payloadB64)),
  ) as { provider_id?: string; nonce?: string; exp?: number }
  if (!decoded.provider_id) throw new Error('no_provider_id')
  if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) throw new Error('state_expired')
  return { provider_id: decoded.provider_id, nonce: decoded.nonce ?? '' }
}

async function importRsaJwk(jwk: Record<string, unknown>): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk as JsonWebKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
}

async function verifyIdToken(
  token: string,
  jwksUri: string,
  expectedIssuer: string,
  expectedAudience: string,
  expectedNonce: string,
): Promise<IdTokenPayload> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('oidc_malformed_id_token')
  const [h, p, s] = parts as [string, string, string]
  const header = JSON.parse(new TextDecoder().decode(b64urlDecode(h))) as {
    kid?: string
    alg?: string
  }
  if (header.alg !== 'RS256') {
    // HS256 ID tokens are legal in OIDC but we forbid them for Sentinel —
    // client secrets do not rotate on key compromise.
    throw new Error('oidc_unsupported_alg')
  }
  const payload = JSON.parse(
    new TextDecoder().decode(b64urlDecode(p)),
  ) as IdTokenPayload

  if (payload.iss !== expectedIssuer) throw new Error('oidc_bad_issuer')
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (!aud.includes(expectedAudience)) throw new Error('oidc_bad_audience')
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp <= now) throw new Error('oidc_expired')

  // Replay defence (OIDC Core §3.1.3.7 step 11): the nonce we minted into the
  // signed state must reappear verbatim in the ID token. A token minted for a
  // different login — or replayed — carries a different nonce, or none.
  if (expectedNonce) {
    const tokenNonce = typeof payload.nonce === 'string' ? payload.nonce : ''
    if (tokenNonce !== expectedNonce) throw new Error('oidc_nonce_mismatch')
  }

  const jwksResp = await fetch(jwksUri, { signal: AbortSignal.timeout(5_000) })
  if (!jwksResp.ok) throw new Error('oidc_jwks_fetch_failed')
  const jwks = await jwksResp.json() as { keys: Array<Record<string, unknown>> }
  // Bind the signature to the key the IdP named. When the token header carries
  // a `kid`, require an exact match — never fall back to an arbitrary key, or a
  // forged token could be checked against a key its issuer never signed with.
  // Only when the header omits `kid` AND the set holds exactly one key do we
  // use that key (a common single-key IdP configuration).
  const jwk = header.kid
    ? jwks.keys.find(k => k.kid === header.kid)
    : (jwks.keys.length === 1 ? jwks.keys[0] : undefined)
  if (!jwk) throw new Error('oidc_no_matching_key')

  const key = await importRsaJwk(jwk)
  const signed = new TextEncoder().encode(`${h}.${p}`)
  const sig = b64urlDecode(s)
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    sig,
    signed,
  )
  if (!ok) throw new Error('oidc_bad_signature')
  return payload
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  const t0 = Date.now()
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')  // opaque, MUST be signed by us
  if (!code || !state) {
    return jsonResponse(400, { error: 'missing_code_or_state' })
  }

  // Fail closed: without a signing secret we cannot tell a state we minted
  // from one an attacker forged, so we refuse rather than trust an opaque,
  // unauthenticated blob (CSRF / session-fixation via forged provider_id).
  if (!SSO_STATE_SECRET) {
    return jsonResponse(503, { error: 'sso_state_secret_unconfigured' })
  }
  let providerId: string
  let stateNonce: string
  try {
    const parsed = await verifyStateHmac(state)
    providerId = parsed.provider_id
    stateNonce = parsed.nonce
  } catch {
    return jsonResponse(400, { error: 'invalid_state' })
  }

  const db = adminClient()
  const { data: provider, error: provErr } = await db
    .from('identity_providers')
    .select('id, org_id, kind, config, group_claim_path')
    .eq('id', providerId)
    .eq('is_enabled', true)
    .is('deleted_at', null)
    .maybeSingle()
  if (provErr || !provider || provider.kind !== 'oidc') {
    return jsonResponse(404, { error: 'provider_not_found' })
  }

  const cfg = provider.config as unknown as OidcConfig

  // Exchange code → tokens.
  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirect_uri,
    client_id: cfg.client_id,
    client_secret: cfg.client_secret,
  })
  const tokResp = await fetch(cfg.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: tokenBody,
    signal: AbortSignal.timeout(10_000),
  })
  if (!tokResp.ok) {
    await logScimAudit(db, {
      org_id: provider.org_id,
      provider_id: provider.id,
      token_id: null,
      method: 'POST',
      path: '/sso/oidc/callback',
      status_code: 502,
      error_code: 'token_exchange_failed',
      latency_ms: Date.now() - t0,
    })
    return jsonResponse(502, { error: 'token_exchange_failed' })
  }
  const toks = await tokResp.json() as { id_token?: string }
  if (!toks.id_token) {
    return jsonResponse(502, { error: 'no_id_token' })
  }

  let claims: IdTokenPayload
  try {
    claims = await verifyIdToken(
      toks.id_token,
      cfg.jwks_uri,
      cfg.issuer,
      cfg.client_id,
      stateNonce,
    )
  } catch (err) {
    await logScimAudit(db, {
      org_id: provider.org_id,
      provider_id: provider.id,
      token_id: null,
      method: 'POST',
      path: '/sso/oidc/callback',
      status_code: 401,
      error_code: err instanceof Error ? err.message : 'verify_failed',
      latency_ms: Date.now() - t0,
    })
    return jsonResponse(401, {
      error: err instanceof Error ? err.message : 'verify_failed',
    })
  }

  const email = typeof claims.email === 'string' ? claims.email : null
  if (!email) {
    return jsonResponse(400, { error: 'missing_email_claim' })
  }

  const { user_id, created } = await jitProvision(db, {
    org_id: provider.org_id,
    provider_id: provider.id,
    email,
    external_subject: claims.sub,
    display_name: typeof claims.name === 'string' ? claims.name : undefined,
  })

  // Mint a Supabase magic link that carries the fresh app_metadata.
  // The caller (login page) redirects to this URL to complete the flow.
  const mag = await (db as unknown as {
    auth: {
      admin: {
        generateLink(payload: Record<string, unknown>): Promise<{
          data: { properties?: { action_link?: string } }
          error: { message: string } | null
        }>
      }
    }
  }).auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${Deno.env.get('APP_BASE_URL') ?? ''}/overview` },
  })
  if (mag.error) {
    return jsonResponse(500, { error: 'magiclink_failed' })
  }

  await db.from('sso_sessions').insert({
    org_id: provider.org_id,
    user_id,
    provider_id: provider.id,
    external_subject: claims.sub,
    expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    ip_address: req.headers.get('cf-connecting-ip'),
    user_agent: req.headers.get('user-agent'),
  }).then(() => undefined, () => undefined)

  await logScimAudit(db, {
    org_id: provider.org_id,
    provider_id: provider.id,
    token_id: null,
    method: 'POST',
    path: '/sso/oidc/callback',
    status_code: 200,
    external_id: claims.sub,
    sentinel_user_id: user_id,
    latency_ms: Date.now() - t0,
  })

  const actionLink = mag.data.properties?.action_link
  if (!actionLink) {
    return jsonResponse(500, { error: 'no_action_link' })
  }
  return Response.redirect(actionLink, 302)
})
