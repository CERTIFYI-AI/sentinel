// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// integrationConnectService — the browser half of the connect handshake.
//
// Credentials go to the FastAPI backend, NOT to Supabase directly, because
// only the server holds the encryption key. Writing them from the browser
// would either store plaintext or ship the key to every client; both are
// unacceptable, and `integrations.credentials_encrypted` is service-role
// write-only for that reason.
//
// This module never persists a credential: values are passed through to fetch
// and go out of scope. Nothing here logs the request body.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

/** Base URL of the Sentinel API. Empty means same-origin. */
const API_BASE = (import.meta.env.VITE_SENTINEL_API_URL ?? '').replace(/\/$/, '')

export interface ConnectResult {
  integrationId: string
  status: string
  jobId: string | null
  message: string
}

async function authHeader(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Not signed in — cannot connect an integration.')
  }
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Your session has expired. Sign in again to connect an integration.')
  return { Authorization: `Bearer ${token}` }
}

/**
 * Read the server's error message without letting a non-JSON body (an HTML
 * error page from a proxy, say) surface as unreadable noise.
 */
async function errorFrom(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (typeof body?.detail === 'string') return body.detail
    if (Array.isArray(body?.detail)) return 'The details provided are not valid for this integration.'
  } catch {
    /* fall through to the status-based message */
  }
  if (res.status === 401) return 'Your session has expired. Sign in again.'
  if (res.status === 403) return 'You do not have permission to connect integrations.'
  if (res.status === 503) return 'The integration backend is not configured. Contact your administrator.'
  return `Could not connect (HTTP ${res.status}). Nothing was stored.`
}

/**
 * Store credentials for a catalogue product and queue its first sync.
 *
 * Throws on any failure so the form shows a real error — a silent success
 * here would leave an integration that never collects, which is exactly the
 * state this whole feature exists to make visible.
 */
export async function connectIntegration(input: {
  catalogSlug: string
  name?: string
  credentials: Record<string, string>
}): Promise<ConnectResult> {
  const headers = { 'Content-Type': 'application/json', ...(await authHeader()) }

  let res: Response
  try {
    res = await fetch(`${API_BASE}/v1/integrations/connect`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        catalog_slug: input.catalogSlug,
        name: input.name,
        credentials: input.credentials,
      }),
    })
  } catch {
    // Network-level failure: do not claim anything about what the server did.
    throw new Error('Could not reach the integration backend. Nothing was stored.')
  }

  if (!res.ok) throw new Error(await errorFrom(res))

  const body = await res.json()
  return {
    integrationId: String(body.integration_id),
    status: String(body.status ?? 'configuring'),
    jobId: body.job_id ? String(body.job_id) : null,
    message: String(body.message ?? 'Connected.'),
  }
}

/** Queue another sync for an already-connected integration. */
export async function resyncIntegration(integrationId: string): Promise<ConnectResult> {
  const headers = { 'Content-Type': 'application/json', ...(await authHeader()) }
  let res: Response
  try {
    res = await fetch(`${API_BASE}/v1/integrations/${integrationId}/sync`, {
      method: 'POST',
      headers,
    })
  } catch {
    throw new Error('Could not reach the integration backend.')
  }
  if (!res.ok) throw new Error(await errorFrom(res))
  const body = await res.json()
  return {
    integrationId: String(body.integration_id),
    status: String(body.status ?? 'queued'),
    jobId: body.job_id ? String(body.job_id) : null,
    message: String(body.message ?? 'Sync queued.'),
  }
}

/**
 * Slugs the SERVER will accept, i.e. those with a registered adapter.
 *
 * The catalogue's `adapter_status` drives the UI, and this is the server's own
 * answer to the same question. Returns null when the backend cannot be
 * reached, so the caller can fall back to the catalogue rather than wrongly
 * concluding nothing is connectable.
 */
export async function fetchServerAvailableSlugs(): Promise<string[] | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/integrations/available`)
    if (!res.ok) return null
    const body = await res.json()
    return Array.isArray(body?.slugs) ? body.slugs.map(String) : null
  } catch {
    return null
  }
}
