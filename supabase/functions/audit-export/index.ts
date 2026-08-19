/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 * See LICENSE for details.
 *
 * audit-export — authenticated audit log exporter.
 *
 * Query params:
 *   org_id      — required
 *   format      — one of cef|leef|syslog|splunk|ndjson (default ndjson)
 *   since_seq   — bigint, inclusive
 *   until_seq   — bigint, inclusive
 *   limit       — max 10 000 (default 1 000)
 *
 * Auth: Bearer JWT (Supabase user) — org_id must match caller's claim.
 */

// @ts-expect-error runtime
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// @ts-expect-error runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import {
  toCef,
  toLeef,
  toSplunkHec,
  toSyslog5424,
  type AuditLogRow,
} from '../_shared/audit-exporters.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: { env: { get(k: string): string | undefined } }

const DEFAULT_LIMIT = 1_000
const MAX_LIMIT = 10_000

function cors(): Record<string, string> {
  const origin = Deno.env.get('ALLOWED_ORIGIN')
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() })
  }
  if (req.method !== 'GET') {
    return new Response('method_not_allowed', { status: 405, headers: cors() })
  }

  const auth = req.headers.get('authorization') ?? ''
  if (!auth.toLowerCase().startsWith('bearer ')) {
    return new Response('missing_bearer', { status: 401, headers: cors() })
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response('misconfigured', { status: 500, headers: cors() })
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userRes, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userRes.user) {
    return new Response('invalid_jwt', { status: 401, headers: cors() })
  }
  const callerOrg =
    (userRes.user.app_metadata as Record<string, unknown> | undefined)
      ?.org_id
  if (typeof callerOrg !== 'string') {
    return new Response('no_org_claim', { status: 403, headers: cors() })
  }

  const url = new URL(req.url)
  const orgId = url.searchParams.get('org_id') ?? callerOrg
  if (orgId !== callerOrg) {
    return new Response('cross_tenant_denied', { status: 403, headers: cors() })
  }
  const format = (url.searchParams.get('format') ?? 'ndjson').toLowerCase()
  const limit = Math.min(
    Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT),
    MAX_LIMIT,
  )
  const sinceSeq = url.searchParams.get('since_seq')
  const untilSeq = url.searchParams.get('until_seq')

  // Use service-role only for the export scan — RLS would otherwise force
  // a re-evaluation of auth.current_org_id() on every row, and we've
  // already checked the claim above.
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let query = admin
    .from('audit_log')
    .select('*')
    .eq('org_id', orgId)
    .order('sequence_no', { ascending: true })
    .limit(limit)
  if (sinceSeq) query = query.gte('sequence_no', Number(sinceSeq))
  if (untilSeq) query = query.lte('sequence_no', Number(untilSeq))

  const { data, error } = await query
  if (error) {
    console.error('audit-export query failed:', error.message)
    return new Response('query_failed', {
      status: 500,
      headers: cors(),
    })
  }
  const rows = (data ?? []) as unknown as AuditLogRow[]
  const host = new URL(supabaseUrl).hostname

  let body: string
  let contentType: string
  switch (format) {
    case 'cef':
      body = rows.map(toCef).join('\n')
      contentType = 'text/plain; charset=utf-8'
      break
    case 'leef':
      body = rows.map(toLeef).join('\n')
      contentType = 'text/plain; charset=utf-8'
      break
    case 'syslog':
      body = rows.map(r => toSyslog5424(r, host)).join('\n')
      contentType = 'text/plain; charset=utf-8'
      break
    case 'splunk':
      body = rows.map(r => toSplunkHec(r, host)).join('\n')
      contentType = 'application/x-ndjson'
      break
    case 'ndjson':
      body = rows.map(r => JSON.stringify(r)).join('\n')
      contentType = 'application/x-ndjson'
      break
    default:
      return new Response('unknown_format', { status: 400, headers: cors() })
  }
  return new Response(body, {
    status: 200,
    headers: {
      ...cors(),
      'content-type': contentType,
      'x-sentinel-row-count': String(rows.length),
    },
  })
})
