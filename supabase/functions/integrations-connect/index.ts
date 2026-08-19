/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 * See LICENSE for details.
 *
 * integrations-connect — Supabase Edge Function (Deno runtime)
 *
 * The browser half of the evidence pipeline, on free-tier infrastructure. It
 * replaces the FastAPI `/v1/integrations/*` surface (sentinel/integrations/api.py)
 * for deployments that do not run the Python API host: the connect/sync/available
 * actions run here (Supabase Edge Functions, free), while the durable sync
 * WORKER stays Python and runs as a scheduled GitHub Actions job
 * (.github/workflows/evidence-worker.yml). See
 * docs/operations/backend-deployment.md and
 * docs/reference/continuous-evidence-roadmap.md.
 *
 * Why an edge function and not the browser writing directly: credentials must be
 * AES-256-GCM encrypted with a key the browser must never see, and enqueueing a
 * sync job is a service-role write (background_jobs has no client insert policy).
 * Both belong on the server.
 *
 * Request (POST, single function, routed by body.action):
 *   Authorization: Bearer <user JWT>
 *   { "action": "connect", "catalog_slug": "github",
 *     "credentials": { ... }, "name": "GitHub — acme" }
 *   { "action": "sync", "integration_id": "<uuid>" }
 *   { "action": "register", "catalog_slug": "okta",
 *     "details": { "tenant_ref": "...", "owner_name": "...", ... } }
 *   { "action": "available" }
 *
 * Two connection modes, and the difference is the honesty guarantee:
 *   connect   an adapter ships. Credentials are encrypted and a sync queued.
 *   register  no adapter. The source is recorded with an accountable owner and
 *             a review cadence, holds NO credentials, and queues NO job. This
 *             is what the other 216 catalogue products get, instead of a
 *             credential form for a secret nothing could ever use.
 *
 * Security invariants (mirroring the Python reference, verified against the live
 * schema of project vhparvughsygyknblkzt):
 *   1. Plaintext credentials never touch the database or a log. They are
 *      encrypted here into {v,nonce,ciphertext}, and only that blob is stored —
 *      the exact shape sentinel/integrations/crypto.py decrypts. Byte-level
 *      interop is pinned by crypto_interop_test.ts.
 *   2. Only a catalogue slug whose adapter_status is 'available' or 'beta' is
 *      accepted by `connect` — the same "no adapter, no connect" promise the
 *      catalogue makes. `register` accepts any catalogued slug precisely
 *      because it stores no credential and starts no collection.
 *   3. The caller's org comes from their verified JWT (user_profiles.org_id, i.e.
 *      current_user_org_id()), never from the request body. integrations.org_id
 *      defaults to current_user_org_id(), which is NULL under the service role,
 *      so it is set explicitly here.
 *   4. Enqueueing is privileged: it runs with the service-role key, which is why
 *      it lives server-side and not in the browser.
 *
 * Environment (SUPABASE_* are injected by Supabase; add the last one as a secret):
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   SENTINEL_CREDENTIALS_KEY  — base64 that decodes to exactly 32 bytes (AES-256)
 *   ALLOWED_ORIGIN            — optional, defaults to "*"
 */

// @ts-expect-error Deno std is resolved at runtime in the Supabase edge runtime.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// @ts-expect-error Supabase JS v2 is resolved at runtime in the edge runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { encryptCredentials } from './crypto.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: { env: { get(k: string): string | undefined } }

function corsHeaders(): Record<string, string> {
  const origin = Deno.env.get('ALLOWED_ORIGIN')
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// AES-256-GCM credential encryption lives in ./crypto.ts (imported above) so it
// can be unit-tested without importing this module, which would start serve().

interface Body {
  action?: string
  catalog_slug?: string
  credentials?: Record<string, unknown>
  name?: string
  integration_id?: string
  /** register only: the source's own descriptive fields. Never a secret. */
  details?: Record<string, unknown>
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' })

  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return jsonResponse(401, { error: 'Sign in to manage integrations.' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const credsKey = Deno.env.get('SENTINEL_CREDENTIALS_KEY')
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse(500, { error: 'edge_function_misconfigured' })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return jsonResponse(400, { error: 'invalid_json' })
  }
  const action = body.action ?? 'connect'

  // 1. Identify the caller from the incoming JWT.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) {
    return jsonResponse(401, { error: 'Your session has expired. Sign in again.' })
  }
  const userId = userData.user.id

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 2. Resolve the caller's org exactly as current_user_org_id() does.
  const { data: profile, error: profErr } = await admin
    .from('user_profiles')
    .select('org_id')
    .eq('id', userId)
    .maybeSingle()
  if (profErr) return jsonResponse(500, { error: 'org_lookup_failed' })
  const orgId = profile?.org_id as string | undefined
  if (!orgId) return jsonResponse(401, { error: 'Your account is not linked to an organisation.' })

  // ── available: slugs the server will accept (adapter shipped) ──────────────
  if (action === 'available') {
    const { data, error } = await admin
      .from('integration_catalog')
      .select('slug')
      .in('adapter_status', ['available', 'beta'])
    if (error) return jsonResponse(500, { error: 'catalog_read_failed' })
    return jsonResponse(200, { slugs: (data ?? []).map((r: { slug: string }) => r.slug) })
  }

  // ── sync: queue another run for an already-connected integration ───────────
  if (action === 'sync') {
    const integrationId = body.integration_id
    if (!integrationId || !UUID_RE.test(integrationId)) {
      return jsonResponse(400, { error: 'invalid_integration_id' })
    }
    const { data: row, error: rowErr } = await admin
      .from('integrations')
      .select('catalog_slug, connection_mode')
      .eq('id', integrationId)
      .eq('org_id', orgId)
      .eq('is_deleted', false)
      .maybeSingle()
    if (rowErr) return jsonResponse(500, { error: 'lookup_failed' })
    if (!row || !row.catalog_slug) {
      return jsonResponse(404, { error: 'No connected integration with that id in your organisation.' })
    }
    // A manual registration has no credentials and no adapter; a job for it can
    // only fail, five times, and burn the retry budget. Refuse it here.
    if (row.connection_mode === 'manual') {
      return jsonResponse(400, {
        error: 'This source is monitored manually — there is no adapter to sync it with.',
      })
    }
    // `connect` gates on adapter_status but `sync` did not, so a product later
    // demoted to catalogued could still queue work the worker must refuse
    // (2026-08-18 re-audit, finding N3).
    const { data: syncCat, error: syncCatErr } = await admin
      .from('integration_catalog')
      .select('adapter_status')
      .eq('slug', row.catalog_slug)
      .maybeSingle()
    if (syncCatErr) return jsonResponse(500, { error: 'catalog_read_failed' })
    if (!syncCat || !['available', 'beta'].includes(syncCat.adapter_status)) {
      return jsonResponse(400, {
        error: `No adapter ships for "${row.catalog_slug}" any more, so a sync would collect nothing.`,
      })
    }
    const { data: job, error: jobErr } = await admin
      .from('background_jobs')
      .insert({
        org_id: orgId,
        job_type: 'integration_sync',
        payload: { integration_id: integrationId, catalog_slug: row.catalog_slug },
      })
      .select('id')
      .single()
    if (jobErr) return jsonResponse(500, { error: 'Could not queue the sync.' })
    return jsonResponse(200, {
      integration_id: integrationId,
      status: 'queued',
      job_id: job.id,
      message: 'Sync queued.',
    })
  }

  // ── register: record a source we cannot yet collect from ──────────────────
  //
  // No credential is taken, no job is queued, and the row is marked
  // connection_mode='manual' so the daily cron never enqueues it. What it DOES
  // create is real governance state: a named accountable owner and a review
  // cadence against a catalogued source, which is what ISO/IEC 42001 §9.1 and
  // EU AI Act Art. 12 actually turn on.
  if (action === 'register') {
    const slug = (body.catalog_slug ?? '').trim().toLowerCase()
    if (!slug) return jsonResponse(400, { error: 'catalog_slug is required.' })

    const { data: cat, error: catErr } = await admin
      .from('integration_catalog')
      .select('slug, name, category')
      .eq('slug', slug)
      .maybeSingle()
    if (catErr) return jsonResponse(500, { error: 'catalog_read_failed' })
    if (!cat) return jsonResponse(404, { error: `"${slug}" is not in the catalogue.` })

    // Defence in depth. These fields land in `integrations.config`, which is
    // readable by every member of the org — so a secret arriving here through a
    // future UI mistake would be stored in plaintext and shown back. Refuse the
    // request rather than silently dropping the key, so the mistake is visible.
    const details = (body.details ?? {}) as Record<string, unknown>
    const SECRETISH = /token|secret|password|passwd|credential|private[_-]?key|api[_-]?key|client[_-]?secret/i
    const offending = Object.keys(details).filter((k) => SECRETISH.test(k))
    if (offending.length > 0) {
      return jsonResponse(400, {
        error: 'A monitored source stores no credentials. Remove: ' + offending.join(', '),
      })
    }
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(details)) {
      if (v === null || v === undefined) continue
      const text = String(v).trim()
      if (text) clean[k] = text.slice(0, 2000)
    }
    if (!clean.owner_name || !clean.review_cadence) {
      return jsonResponse(400, {
        error: 'An accountable owner and a review cadence are required — a source with neither is not monitored.',
      })
    }

    const displayName = (body.name && body.name.trim()) || cat.name || slug
    const { data: existing, error: exErr } = await admin
      .from('integrations')
      .select('id, connection_mode')
      .eq('org_id', orgId)
      .eq('catalog_slug', slug)
      .eq('is_deleted', false)
      .maybeSingle()
    if (exErr) return jsonResponse(500, { error: 'Could not save the source. Nothing was stored.' })

    // Never silently strip a working automated connection down to a manual
    // one: that would stop real collection on somebody else's integration.
    if (existing && existing.connection_mode === 'automated') {
      return jsonResponse(409, {
        error: `${displayName} is already connected with an adapter. Disconnect it first if you want to track it manually.`,
      })
    }

    const row = {
      name: displayName,
      provider: slug,
      catalog_slug: slug,
      category: cat.category ?? 'other',
      status: 'monitored',
      connection_mode: 'manual',
      direction: 'inbound',
      health: 'unknown',
      owner_name: clean.owner_name,
      auth_method: clean.auth_method ?? null,
      config: clean,
      updated_at: new Date().toISOString(),
    }

    let integrationId: string
    if (existing) {
      const { error: updErr } = await admin
        .from('integrations').update(row).eq('id', existing.id)
      if (updErr) return jsonResponse(500, { error: 'Could not save the source. Nothing was stored.' })
      integrationId = existing.id
    } else {
      const { data: ins, error: insErr } = await admin
        .from('integrations').insert({ org_id: orgId, ...row }).select('id').single()
      if (insErr) return jsonResponse(500, { error: 'Could not save the source. Nothing was stored.' })
      integrationId = ins.id
    }

    return jsonResponse(200, {
      integration_id: integrationId,
      status: 'monitored',
      job_id: null,
      message:
        `${displayName} is now a monitored source owned by ${clean.owner_name}. `
        + 'No adapter ships for it, so nothing is collected automatically — its evidence is refreshed '
        + `${clean.review_cadence.toLowerCase()}.`,
    })
  }

  // ── connect: encrypt credentials, upsert the integration, queue first sync ──
  if (action === 'connect') {
    const slug = (body.catalog_slug ?? '').trim().toLowerCase()
    if (!slug) return jsonResponse(400, { error: 'catalog_slug is required.' })
    if (!body.credentials || typeof body.credentials !== 'object') {
      return jsonResponse(400, { error: 'credentials are required.' })
    }
    if (!credsKey) {
      return jsonResponse(503, { error: 'Credential encryption key is not configured on the server.' })
    }

    // Refuse a slug with no shipped adapter — the catalogue's own gate.
    const { data: cat, error: catErr } = await admin
      .from('integration_catalog')
      .select('slug, name, adapter_status')
      .eq('slug', slug)
      .maybeSingle()
    if (catErr) return jsonResponse(500, { error: 'catalog_read_failed' })
    if (!cat || !['available', 'beta'].includes(cat.adapter_status)) {
      return jsonResponse(400, { error: `No adapter ships for "${slug}"; it cannot be connected yet.` })
    }

    let blob: { v: number; nonce: string; ciphertext: string }
    try {
      blob = await encryptCredentials(body.credentials, credsKey)
    } catch {
      // Never echo the cause: it could quote a submitted credential value.
      return jsonResponse(503, { error: 'Credential encryption is not correctly configured.' })
    }

    const displayName = (body.name && body.name.trim()) || cat.name || slug

    // Upsert on (org_id, catalog_slug): reconnecting updates in place. Done as
    // select-then-write because the uniqueness is a partial index (is_deleted).
    const { data: existing, error: exErr } = await admin
      .from('integrations')
      .select('id')
      .eq('org_id', orgId)
      .eq('catalog_slug', slug)
      .eq('is_deleted', false)
      .maybeSingle()
    if (exErr) return jsonResponse(500, { error: 'Could not save the integration. Nothing was stored.' })

    let integrationId: string
    if (existing) {
      const { error: updErr } = await admin
        .from('integrations')
        .update({
          credentials_encrypted: blob,
          status: 'configuring',
          // A source previously registered as monitored is now genuinely
          // collecting. Leaving it 'manual' would both mislabel it and violate
          // integrations_manual_holds_no_credentials.
          connection_mode: 'automated',
          last_run_error: null,
          name: displayName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      if (updErr) return jsonResponse(500, { error: 'Could not save the integration. Nothing was stored.' })
      integrationId = existing.id
    } else {
      const { data: ins, error: insErr } = await admin
        .from('integrations')
        .insert({
          org_id: orgId,
          name: displayName,
          provider: slug,
          catalog_slug: slug,
          status: 'configuring',
          connection_mode: 'automated',
          direction: 'inbound',
          health: 'unknown',
          credentials_encrypted: blob,
        })
        .select('id')
        .single()
      if (insErr) return jsonResponse(500, { error: 'Could not save the integration. Nothing was stored.' })
      integrationId = ins.id
    }

    const { data: job, error: jobErr } = await admin
      .from('background_jobs')
      .insert({
        org_id: orgId,
        job_type: 'integration_sync',
        payload: { integration_id: integrationId, catalog_slug: slug },
      })
      .select('id')
      .single()
    if (jobErr) {
      return jsonResponse(500, { error: 'Saved, but the first sync could not be queued. Use Sync now to retry.' })
    }

    return jsonResponse(200, {
      integration_id: integrationId,
      status: 'configuring',
      job_id: job.id,
      message: 'Credentials stored securely. The first sync has been queued.',
    })
  }

  return jsonResponse(400, { error: `unknown action: ${action}` })
})
