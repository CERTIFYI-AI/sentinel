/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 * See LICENSE for details.
 *
 * Shared helpers for the SSO edge functions (sso-saml-acs, sso-oidc-callback,
 * scim-users, scim-groups).
 *
 * Design rules:
 *   - No dependency on a specific IdP vendor. Sentinel integrates by
 *     IETF/OASIS standards (SAML 2.0, OIDC 1.0, SCIM 2.0).
 *   - All crypto uses Web Crypto, not Node. The edge runtime is Deno.
 *   - Service-role key is read from Deno.env; never echoed in logs.
 */

// @ts-expect-error runtime-only import
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: { env: { get(k: string): string | undefined } }

export interface IdpLookup {
  provider_id: string
  org_id: string
  kind: 'saml' | 'oidc'
  display_name: string
  config: Record<string, unknown>
  group_claim_path: string | null
  org_claim_path: string | null
}

export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  }
}

export function jsonResponse(
  status: number,
  body: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'content-type': 'application/json' },
  })
}

export function scimError(
  status: number,
  detail: string,
  scimType?: string,
): Response {
  return new Response(
    JSON.stringify({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      status: String(status),
      detail,
      ...(scimType ? { scimType } : {}),
    }),
    {
      status,
      headers: {
        ...corsHeaders(),
        'content-type': 'application/scim+json',
      },
    },
  )
}

export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    throw new Error('edge_function_misconfigured')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Constant-time string equality — used for SCIM bearer comparison. */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/** Extract the bearer token from an Authorization header or return null. */
export function bearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.toLowerCase().startsWith('bearer ')) return null
  return auth.slice(7).trim() || null
}

/**
 * Resolve an incoming SCIM bearer to (org_id, provider_id, token_id) if
 * it matches an unrevoked, non-expired row in scim_tokens.
 */
export async function resolveScimToken(
  db: SupabaseClient,
  bearer: string,
): Promise<
  | { org_id: string; provider_id: string; token_id: string }
  | null
> {
  const hash = await sha256Hex(bearer)
  const { data } = await db
    .from('scim_tokens')
    .select('id, org_id, provider_id, expires_at, revoked_at')
    .eq('token_hash', hash)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()
  if (!data) return null
  if (data.revoked_at !== null) return null
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return null
  }
  // Best-effort last_used_at update; do not block the request on failure.
  void db
    .from('scim_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => undefined, () => undefined)
  return {
    org_id: data.org_id as string,
    provider_id: data.provider_id as string,
    token_id: data.id as string,
  }
}

export async function logScimAudit(
  db: SupabaseClient,
  row: {
    org_id: string
    provider_id: string | null
    token_id: string | null
    method: string
    path: string
    status_code: number
    external_id?: string | null
    sentinel_user_id?: string | null
    request_digest?: string | null
    error_code?: string | null
    latency_ms?: number | null
    ip_address?: string | null
    user_agent?: string | null
  },
): Promise<void> {
  await db.from('scim_audit_events').insert(row).then(
    () => undefined,
    () => undefined,
  )
}

/**
 * Resolve (creating if necessary) a Supabase auth user for a given IdP
 * external subject, then ensure membership in user_roles for the org.
 * Writes app_metadata.org_id so the WS0.1 RLS helper picks up the right
 * tenant on the next JWT refresh.
 */
export async function jitProvision(
  db: SupabaseClient,
  params: {
    org_id: string
    provider_id: string
    email: string
    external_subject: string
    display_name?: string
    role?: string
  },
): Promise<{ user_id: string; created: boolean }> {
  const email = params.email.trim().toLowerCase()
  // Look up by email first (Supabase stores email lowercased).
  const { data: existing } = await db
    .from('auth_users_view')
    .select('id')
    .eq('email', email)
    .limit(1)
    .maybeSingle()

  let userId: string
  let created = false
  if (existing?.id) {
    userId = existing.id as string
    // Force app_metadata.org_id to match the SSO org.
    const adminAny = (db as unknown as {
      auth: {
        admin: {
          updateUserById(
            id: string,
            payload: Record<string, unknown>,
          ): Promise<unknown>
        }
      }
    }).auth
    await adminAny.admin.updateUserById(userId, {
      app_metadata: { org_id: params.org_id, provider_id: params.provider_id },
    })
  } else {
    const adminAny = (db as unknown as {
      auth: {
        admin: {
          createUser(payload: Record<string, unknown>): Promise<{
            data: { user: { id: string } | null }
            error: { message: string } | null
          }>
        }
      }
    }).auth
    const res = await adminAny.admin.createUser({
      email,
      email_confirm: true,
      app_metadata: {
        org_id: params.org_id,
        provider_id: params.provider_id,
        provider: 'sso',
      },
      user_metadata: params.display_name
        ? { full_name: params.display_name }
        : {},
    })
    if (res.error || !res.data.user) {
      throw new Error(`jit_create_failed: ${res.error?.message ?? 'unknown'}`)
    }
    userId = res.data.user.id
    created = true
  }

  // Upsert user_roles — key is (user_id, org_id).
  await db
    .from('user_roles')
    .upsert(
      {
        user_id: userId,
        org_id: params.org_id,
        role: params.role ?? 'member',
      },
      { onConflict: 'user_id,org_id' },
    )
    .then(() => undefined, () => undefined)

  return { user_id: userId, created }
}

/** ISO 8601 timestamp used throughout SCIM responses. */
export function isoNow(): string {
  return new Date().toISOString()
}
