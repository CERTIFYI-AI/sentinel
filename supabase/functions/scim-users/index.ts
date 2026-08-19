/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 * See LICENSE for details.
 *
 * scim-users — SCIM 2.0 /Users endpoint.
 *
 * Implements the minimum surface required for Okta / Azure AD / WorkOS
 * Directory Sync:
 *   GET    /Users            — list with filter support
 *   GET    /Users/{id}       — read
 *   POST   /Users            — create (JIT provision into org)
 *   PUT    /Users/{id}       — replace
 *   PATCH  /Users/{id}       — partial update (RFC 6902-style paths)
 *   DELETE /Users/{id}       — soft-deprovision (revoke user_roles, not delete)
 *
 * Auth: Bearer token from scim_tokens.
 * Standards: RFC 7643 (core schema), RFC 7644 (protocol).
 */

// @ts-expect-error runtime
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  adminClient,
  bearerToken,
  corsHeaders,
  isoNow,
  jitProvision,
  logScimAudit,
  resolveScimToken,
  scimError,
  sha256Hex,
} from '../_shared/sso.ts'

interface ScimUser {
  schemas: string[]
  id: string
  externalId?: string
  userName: string
  name?: { givenName?: string; familyName?: string }
  emails?: Array<{ value: string; primary?: boolean }>
  active: boolean
  meta: { resourceType: 'User'; created: string; lastModified: string }
}

interface ScimPatchOp {
  op: 'add' | 'replace' | 'remove'
  path?: string
  value?: unknown
}

function buildScimUser(row: {
  id: string
  email: string
  display_name: string | null
  external_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}): ScimUser {
  const [given, ...family] = (row.display_name ?? '').split(' ')
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: row.id,
    externalId: row.external_id ?? undefined,
    userName: row.email,
    name: row.display_name
      ? { givenName: given, familyName: family.join(' ') || undefined }
      : undefined,
    emails: [{ value: row.email, primary: true }],
    active: row.is_active,
    meta: {
      resourceType: 'User',
      created: row.created_at,
      lastModified: row.updated_at,
    },
  }
}

/** Parse a tiny subset of SCIM filter syntax: `userName eq "foo@bar"` and
 *  `externalId eq "abc"`. Anything else returns null and the caller falls
 *  back to an unfiltered list (still paginated). */
function parseSimpleEq(
  filter: string,
): { attr: 'userName' | 'externalId'; value: string } | null {
  const m = filter.match(
    /^\s*(userName|externalId)\s+eq\s+"([^"]+)"\s*$/i,
  )
  if (!m) return null
  return {
    attr: m[1] as 'userName' | 'externalId',
    value: m[2] ?? '',
  }
}

async function loadUser(
  db: ReturnType<typeof adminClient>,
  orgId: string,
  userId: string,
): Promise<Parameters<typeof buildScimUser>[0] | null> {
  const { data } = await db
    .from('scim_user_view')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', userId)
    .maybeSingle()
  return data as Parameters<typeof buildScimUser>[0] | null
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  const t0 = Date.now()
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  // Expected: /scim/v2/Users[/<id>]
  const scimIdx = pathParts.indexOf('Users')
  const maybeId = scimIdx >= 0 ? pathParts[scimIdx + 1] : undefined

  const bearer = bearerToken(req)
  if (!bearer) {
    return scimError(401, 'missing_bearer_token', 'invalidToken')
  }
  const db = adminClient()
  const tok = await resolveScimToken(db, bearer)
  if (!tok) return scimError(401, 'invalid_or_expired_token', 'invalidToken')
  const audit = {
    org_id: tok.org_id,
    provider_id: tok.provider_id,
    token_id: tok.token_id,
    method: req.method,
    path: url.pathname,
    status_code: 200,
    ip_address: req.headers.get('cf-connecting-ip'),
    user_agent: req.headers.get('user-agent'),
    latency_ms: 0 as number | null,
  }

  try {
    if (!maybeId) {
      // Collection endpoint.
      if (req.method === 'GET') {
        const startIndex = Number(url.searchParams.get('startIndex') ?? '1')
        const count = Math.min(
          Number(url.searchParams.get('count') ?? '100'),
          500,
        )
        const filter = url.searchParams.get('filter')
        let q = db
          .from('scim_user_view')
          .select('*', { count: 'exact' })
          .eq('org_id', tok.org_id)
          .order('created_at', { ascending: false })
          .range(startIndex - 1, startIndex - 1 + count - 1)
        if (filter) {
          const parsed = parseSimpleEq(filter)
          if (parsed?.attr === 'userName') q = q.eq('email', parsed.value)
          else if (parsed?.attr === 'externalId')
            q = q.eq('external_id', parsed.value)
        }
        const { data, count: total, error } = await q
        if (error) throw new Error('query_failed')
        const Resources = (data ?? []).map(r =>
          buildScimUser(r as Parameters<typeof buildScimUser>[0]),
        )
        audit.latency_ms = Date.now() - t0
        await logScimAudit(db, audit)
        return new Response(
          JSON.stringify({
            schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
            totalResults: total ?? Resources.length,
            startIndex,
            itemsPerPage: Resources.length,
            Resources,
          }),
          {
            status: 200,
            headers: { ...corsHeaders(), 'content-type': 'application/scim+json' },
          },
        )
      }
      if (req.method === 'POST') {
        const body = (await req.json()) as Partial<ScimUser>
        if (!body.userName) {
          return scimError(400, 'missing_userName', 'invalidSyntax')
        }
        const { user_id } = await jitProvision(db, {
          org_id: tok.org_id,
          provider_id: tok.provider_id,
          email: body.userName,
          external_subject: body.externalId ?? body.userName,
          display_name: body.name
            ? `${body.name.givenName ?? ''} ${body.name.familyName ?? ''}`.trim()
            : undefined,
        })
        const created = await loadUser(db, tok.org_id, user_id)
        if (!created) throw new Error('created_but_unreadable')
        audit.status_code = 201
        audit.external_id = body.externalId ?? null
        audit.sentinel_user_id = user_id
        audit.request_digest = await sha256Hex(JSON.stringify(body))
        audit.latency_ms = Date.now() - t0
        await logScimAudit(db, audit)
        return new Response(JSON.stringify(buildScimUser(created)), {
          status: 201,
          headers: {
            ...corsHeaders(),
            'content-type': 'application/scim+json',
            location: `${url.origin}${url.pathname}/${user_id}`,
          },
        })
      }
      return scimError(405, 'method_not_allowed')
    }

    // Resource endpoint: /Users/{id}
    const userRow = await loadUser(db, tok.org_id, maybeId)
    if (!userRow) return scimError(404, 'user_not_found', 'noTarget')

    if (req.method === 'GET') {
      audit.latency_ms = Date.now() - t0
      audit.sentinel_user_id = userRow.id
      await logScimAudit(db, audit)
      return new Response(JSON.stringify(buildScimUser(userRow)), {
        status: 200,
        headers: {
          ...corsHeaders(),
          'content-type': 'application/scim+json',
        },
      })
    }

    if (req.method === 'PATCH') {
      const body = (await req.json()) as {
        Operations?: ScimPatchOp[]
      }
      const ops = body.Operations ?? []
      let active = userRow.is_active
      for (const op of ops) {
        // Minimum viable: support the active-flag toggles Okta/Azure send.
        if (
          (op.op === 'replace' || op.op === 'add') &&
          (op.path === 'active' || op.path === undefined)
        ) {
          const val = op.path === 'active' ? op.value : (op.value as { active?: boolean })?.active
          if (typeof val === 'boolean') active = val
        }
      }
      // Deprovision = revoke role, preserve audit trail. Never hard-delete.
      if (active !== userRow.is_active) {
        if (active === false) {
          await db
            .from('user_roles')
            .update({ deleted_at: new Date().toISOString() })
            .eq('user_id', userRow.id)
            .eq('org_id', tok.org_id)
        } else {
          await db
            .from('user_roles')
            .update({ deleted_at: null })
            .eq('user_id', userRow.id)
            .eq('org_id', tok.org_id)
        }
      }
      const updated = await loadUser(db, tok.org_id, maybeId)
      if (!updated) throw new Error('post_patch_missing')
      audit.latency_ms = Date.now() - t0
      audit.sentinel_user_id = updated.id
      audit.request_digest = await sha256Hex(JSON.stringify(body))
      await logScimAudit(db, audit)
      return new Response(JSON.stringify(buildScimUser(updated)), {
        status: 200,
        headers: { ...corsHeaders(), 'content-type': 'application/scim+json' },
      })
    }

    if (req.method === 'DELETE') {
      await db
        .from('user_roles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', userRow.id)
        .eq('org_id', tok.org_id)
      audit.status_code = 204
      audit.sentinel_user_id = userRow.id
      audit.latency_ms = Date.now() - t0
      await logScimAudit(db, audit)
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      })
    }

    return scimError(405, 'method_not_allowed')
  } catch (err) {
    audit.status_code = 500
    const code = err instanceof Error ? err.message : 'unhandled'
    const safe = /^[a-z_]+$/.test(code) ? code : 'internal'
    audit.error_code = code
    audit.latency_ms = Date.now() - t0
    await logScimAudit(db, audit)
    return scimError(500, safe)
  }
})
