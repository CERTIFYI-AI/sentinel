/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 *
 * ai-brain-config — Supabase Edge Function (Deno runtime)
 *
 * Manages per-org AI Brain configuration. Encrypts provider API keys with
 * AES-256-GCM (same blob format as integrations-connect) so plaintext never
 * touches the database. The Python evaluator decrypts with the same
 * sentinel/integrations/crypto.py.
 *
 * Actions:
 *   save   — upsert provider, encrypted key, model prefs
 *   read   — return config without the encrypted blob (key_prefix only)
 *   test   — (future) validate the key with a test API call
 *
 * Security invariants:
 *   1. Plaintext API keys never reach the database or any log.
 *   2. The caller's org comes from their verified JWT, never the body.
 *   3. Only the key_prefix (first 8 chars) is returned to the browser.
 */

// @ts-expect-error Deno std
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// @ts-expect-error Supabase JS v2
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { encryptCredentials } from '../integrations-connect/crypto.ts'

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

const PROVIDERS = ['openai', 'anthropic', 'google', 'azure'] as const

interface SaveBody {
  action: 'save'
  provider: string
  api_key?: string
  judge_model?: string
  embedding_model?: string
  auto_action_confidence?: number
  enabled?: boolean
}

interface ReadBody {
  action: 'read'
}

type Body = SaveBody | ReadBody | { action?: string }

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' })

  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return jsonResponse(401, { error: 'Sign in to manage AI Brain configuration.' })
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
  const action = body.action ?? 'read'

  // Identify caller from JWT
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

  // Resolve caller's org
  const { data: profile, error: profErr } = await admin
    .from('user_profiles')
    .select('org_id')
    .eq('id', userId)
    .maybeSingle()
  if (profErr) return jsonResponse(500, { error: 'org_lookup_failed' })
  const orgId = profile?.org_id as string | undefined
  if (!orgId) return jsonResponse(401, { error: 'Your account is not linked to an organisation.' })

  // ── read: return config without the encrypted blob ───────────────────────
  if (action === 'read') {
    const { data, error } = await admin
      .from('ai_brain_config')
      .select('id, provider, key_prefix, judge_model, embedding_model, auto_action_confidence, enabled, updated_at')
      .eq('org_id', orgId)
      .maybeSingle()
    if (error) return jsonResponse(500, { error: 'Failed to read AI Brain configuration.' })
    return jsonResponse(200, { config: data })
  }

  // ── save: upsert config with optional encrypted key ──────────────────────
  if (action === 'save') {
    const b = body as SaveBody
    const provider = (b.provider ?? 'openai').toLowerCase()
    if (!PROVIDERS.includes(provider as typeof PROVIDERS[number])) {
      return jsonResponse(400, { error: `Unsupported provider: ${provider}` })
    }

    const row: Record<string, unknown> = {
      provider,
      judge_model: b.judge_model ?? 'gpt-4o-mini',
      embedding_model: b.embedding_model ?? 'text-embedding-3-small',
      auto_action_confidence: b.auto_action_confidence ?? 0.85,
      enabled: b.enabled ?? false,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }

    // Encrypt API key if provided
    if (b.api_key && typeof b.api_key === 'string' && b.api_key.trim()) {
      if (!credsKey) {
        return jsonResponse(503, { error: 'Credential encryption key is not configured on the server.' })
      }
      const apiKey = b.api_key.trim()
      try {
        row.credentials_encrypted = await encryptCredentials(
          { api_key: apiKey, provider },
          credsKey,
        )
      } catch {
        return jsonResponse(503, { error: 'Credential encryption is not correctly configured.' })
      }
      row.key_prefix = apiKey.slice(0, 8) + '…'
    }

    // Upsert on org_id
    const { data: existing } = await admin
      .from('ai_brain_config')
      .select('id')
      .eq('org_id', orgId)
      .maybeSingle()

    if (existing) {
      const { error: updErr } = await admin
        .from('ai_brain_config')
        .update(row)
        .eq('id', existing.id)
      if (updErr) return jsonResponse(500, { error: 'Failed to save AI Brain configuration.' })
    } else {
      const { error: insErr } = await admin
        .from('ai_brain_config')
        .insert({ org_id: orgId, ...row })
      if (insErr) return jsonResponse(500, { error: 'Failed to save AI Brain configuration.' })
    }

    return jsonResponse(200, {
      status: 'saved',
      message: b.api_key ? 'API key encrypted and saved securely.' : 'Configuration saved.',
    })
  }

  return jsonResponse(400, { error: `unknown action: ${action}` })
})
