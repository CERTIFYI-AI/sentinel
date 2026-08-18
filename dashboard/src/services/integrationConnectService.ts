// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// integrationConnectService — the browser half of the connect handshake.
//
// Credentials go to the `integrations-connect` Supabase Edge Function, NOT to
// the database directly, because only the server holds the encryption key.
// Writing them from the browser would either store plaintext or ship the key to
// every client; both are unacceptable, and `integrations.credentials_encrypted`
// is service-role write-only for that reason. The edge function encrypts with
// AES-256-GCM into the exact blob the Python sync worker decrypts.
//
// The function is invoked through supabase-js, which attaches the caller's
// session token automatically — so the server derives the org from the verified
// JWT, never from anything the browser asserts. This module never persists a
// credential: values are passed to invoke() and go out of scope; nothing here
// logs the request body.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

const FUNCTION = 'integrations-connect'

export interface ConnectResult {
  integrationId: string
  status: string
  jobId: string | null
  message: string
}

function ensureConfigured(): void {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Not signed in — cannot manage integrations.')
  }
}

/**
 * Pull the server's own error message out of a failed function invocation,
 * without letting a non-JSON body surface as unreadable noise.
 */
async function messageFromError(error: unknown, fallback: string): Promise<string> {
  // supabase-js FunctionsHttpError carries the Response on `.context`.
  const ctx = (error as { context?: unknown })?.context
  if (ctx && typeof (ctx as Response).json === 'function') {
    try {
      const body = await (ctx as Response).json()
      if (typeof body?.error === 'string') return body.error
    } catch {
      /* fall through */
    }
  }
  const msg = (error as { message?: unknown })?.message
  return typeof msg === 'string' && msg ? msg : fallback
}

/**
 * Store credentials for a catalogue product and queue its first sync.
 *
 * Throws on any failure so the form shows a real error — a silent success here
 * would leave an integration that never collects, which is exactly the state
 * this whole feature exists to make visible.
 */
export async function connectIntegration(input: {
  catalogSlug: string
  name?: string
  credentials: Record<string, string>
}): Promise<ConnectResult> {
  ensureConfigured()
  const { data, error } = await supabase!.functions.invoke(FUNCTION, {
    body: {
      action: 'connect',
      catalog_slug: input.catalogSlug,
      name: input.name,
      credentials: input.credentials,
    },
  })
  if (error) throw new Error(await messageFromError(error, 'Could not connect. Nothing was stored.'))
  return {
    integrationId: String(data.integration_id),
    status: String(data.status ?? 'configuring'),
    jobId: data.job_id ? String(data.job_id) : null,
    message: String(data.message ?? 'Connected.'),
  }
}

/**
 * Register a catalogue product the platform cannot yet collect from.
 *
 * This is the other 216 products' path. It stores NO credential and queues NO
 * sync — what it creates is a governed source with an accountable owner and a
 * review cadence, which is real state an auditor can act on. Rendering a
 * credential form here instead would take a secret nothing could ever use.
 *
 * Throws on failure, like every other write in this file, so the dialog shows
 * the server's own message rather than a success the database never saw.
 */
export async function registerMonitoredSource(input: {
  catalogSlug: string
  name?: string
  details: Record<string, string>
}): Promise<ConnectResult> {
  ensureConfigured()
  const { data, error } = await supabase!.functions.invoke(FUNCTION, {
    body: {
      action: 'register',
      catalog_slug: input.catalogSlug,
      name: input.name,
      details: input.details,
    },
  })
  if (error) {
    throw new Error(await messageFromError(error, 'Could not register the source. Nothing was stored.'))
  }
  return {
    integrationId: String(data.integration_id),
    status: String(data.status ?? 'monitored'),
    jobId: null,
    message: String(data.message ?? 'Source registered.'),
  }
}

/** Queue another sync for an already-connected integration. */
export async function resyncIntegration(integrationId: string): Promise<ConnectResult> {
  ensureConfigured()
  const { data, error } = await supabase!.functions.invoke(FUNCTION, {
    body: { action: 'sync', integration_id: integrationId },
  })
  if (error) throw new Error(await messageFromError(error, 'Could not queue the sync.'))
  return {
    integrationId: String(data.integration_id),
    status: String(data.status ?? 'queued'),
    jobId: data.job_id ? String(data.job_id) : null,
    message: String(data.message ?? 'Sync queued.'),
  }
}

/**
 * Slugs the SERVER will accept, i.e. those whose catalogue adapter_status is
 * 'available' or 'beta'. The catalogue's adapter_status drives the UI, and this
 * is the server's own answer to the same question. Returns null when the
 * function cannot be reached (or the caller is not signed in), so the caller
 * falls back to the catalogue rather than wrongly concluding nothing is
 * connectable.
 */
export async function fetchServerAvailableSlugs(): Promise<string[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase.functions.invoke(FUNCTION, {
      body: { action: 'available' },
    })
    if (error) return null
    return Array.isArray(data?.slugs) ? data.slugs.map(String) : null
  } catch {
    return null
  }
}
