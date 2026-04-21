/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 * See LICENSE for details.
 *
 * set-active-org — Supabase Edge Function (Deno runtime)
 *
 * Writes the caller's active `org_id` into `auth.users.app_metadata.org_id`
 * after verifying the caller is an active member of the target org.
 *
 * This is the server-side half of TenantContext.switchOrg — it is the
 * ONLY place allowed to mutate app_metadata for tenancy claims, and
 * it runs with the service-role key so it can call the auth admin API
 * without exposing that key to the browser.
 *
 * Request:
 *   POST /functions/v1/set-active-org
 *   Authorization: Bearer <user JWT>
 *   Body: { "org_id": "<uuid>" }
 *
 * Responses:
 *   200 { ok: true, org_id }
 *   400 { error: "..." }      missing/invalid body
 *   401 { error: "..." }      missing/invalid auth header
 *   403 { error: "..." }      caller is not a member of target org
 *   500 { error: "..." }      unexpected failure
 *
 * Environment:
 *   SUPABASE_URL               — injected by Supabase
 *   SUPABASE_ANON_KEY          — injected by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY  — injected by Supabase
 *   ALLOWED_ORIGIN             — optional, defaults to "*"
 *
 * Audit:
 *   Every successful switch is written to `audit_events` with
 *   action="tenancy.set_active_org" so security can trail org hops.
 */

// @ts-expect-error Deno std is resolved at runtime in the Supabase edge runtime.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// @ts-expect-error Supabase JS v2 is resolved at runtime in the edge runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: { env: { get(k: string): string | undefined } }

interface SetActiveOrgBody {
  org_id: string
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function corsHeaders(): Record<string, string> {
  const origin = Deno.env.get('ALLOWED_ORIGIN') ?? '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'content-type': 'application/json' },
  })
}

function isSetActiveOrgBody(value: unknown): value is SetActiveOrgBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { org_id?: unknown }).org_id === 'string' &&
    UUID_RE.test((value as { org_id: string }).org_id)
  )
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return jsonResponse(401, { error: 'missing_authorization_header' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse(500, { error: 'edge_function_misconfigured' })
  }

  // 1. Identify the caller from the incoming JWT (honours RLS downstream).
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) {
    return jsonResponse(401, { error: 'invalid_jwt' })
  }
  const userId = userData.user.id

  // 2. Parse and validate the body.
  let parsed: unknown
  try {
    parsed = await req.json()
  } catch {
    return jsonResponse(400, { error: 'invalid_json' })
  }
  if (!isSetActiveOrgBody(parsed)) {
    return jsonResponse(400, { error: 'invalid_body' })
  }
  const nextOrgId = parsed.org_id

  // 3. Membership check — user_roles is the authoritative source of
  //    who-belongs-to-what. Deleted rows must be excluded.
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: membership, error: memErr } = await admin
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('org_id', nextOrgId)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()
  if (memErr) {
    return jsonResponse(500, { error: 'membership_check_failed' })
  }
  if (!membership) {
    return jsonResponse(403, { error: 'not_a_member_of_org' })
  }

  // 4. Write the new claim into app_metadata. This is what Supabase
  //    embeds into freshly-minted JWTs when the caller refreshSession().
  const existingMetadata =
    (userData.user.app_metadata as Record<string, unknown> | undefined) ?? {}
  const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...existingMetadata, org_id: nextOrgId },
  })
  if (updErr) {
    return jsonResponse(500, { error: 'app_metadata_update_failed' })
  }

  // 5. Audit trail — fire-and-forget; do not block the response if the
  //    audit sink is down. Operators see the gap via module_health.
  await admin.from('audit_events').insert({
    org_id: nextOrgId,
    actor_id: userId,
    action: 'tenancy.set_active_org',
    target_type: 'organization',
    target_id: nextOrgId,
    metadata: { previous_org_id: existingMetadata['org_id'] ?? null },
  }).then(() => undefined, () => undefined)

  return jsonResponse(200, { ok: true, org_id: nextOrgId })
})
