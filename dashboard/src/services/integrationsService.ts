// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Integrations (`integrations`) and outbound webhook endpoints
// (`webhook_endpoints`) — the platform's connectivity surface. Both are
// org-scoped via RLS with the tenant column defaulted DB-side; writes throw so
// the UI can never report a false success.
//
// Webhook secrets are never held here: the table stores a sha256 digest plus a
// display prefix, and a generated secret is returned to the caller exactly once
// at creation time.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

// 'monitored' is the resting state of a manually-registered source: recorded
// and owned, collecting nothing automatically. It is deliberately NOT
// 'connected' — the daily sync cron enqueues on that value, and a job for a
// source with no adapter can only fail.
export type IntegrationStatus =
  'connected' | 'degraded' | 'error' | 'disconnected' | 'configuring' | 'monitored'

/**
 * How this integration gets its evidence.
 *   automated  an adapter collects from stored, encrypted credentials
 *   manual     a registered source with an accountable owner and a review
 *              cadence; holds no credentials and collects nothing on its own
 */
export type IntegrationConnectionMode = 'automated' | 'manual'
export type IntegrationHealth = 'passing' | 'degraded' | 'failing' | 'unknown'
export type IntegrationDirection = 'inbound' | 'outbound' | 'bidirectional'

export const INTEGRATION_CATEGORIES = [
  'credit_bureau', 'regulator', 'core_banking', 'payments', 'monitoring',
  'identity', 'ticketing', 'communication', 'mlops', 'storage', 'other',
] as const
export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number]

export interface IntegrationRecord {
  id: string
  name: string
  provider?: string
  category: IntegrationCategory
  status: IntegrationStatus
  connectionMode: IntegrationConnectionMode
  authMethod?: string
  description?: string
  dataFlows: string[]
  health: IntegrationHealth
  direction: IntegrationDirection
  lastSyncAt?: string | null
  connectedAt?: string | null
  ownerName?: string
  config: Record<string, unknown>
  /**
   * Links this org instance to its `integration_catalog` row. Null for the
   * hand-created connectors that predate the catalogue; set whenever an
   * instance is created by connecting a catalogue entry.
   */
  catalogSlug?: string | null
  /** Outcome of the last server-side sync run. */
  lastRunStatus?: 'success' | 'error' | 'partial' | 'running' | null
  /** Error text from the last failed run, for an honest status line. */
  lastRunError?: string | null
  createdAt?: string
  updatedAt?: string
}

function fromRow(r: Record<string, any>): IntegrationRecord {
  return {
    id: r.id,
    name: r.name ?? '',
    provider: r.provider ?? undefined,
    category: (r.category ?? 'other') as IntegrationCategory,
    status: (r.status ?? 'configuring') as IntegrationStatus,
    // Rows created before this column existed are automated by construction:
    // the connect path was the only writer.
    connectionMode: (r.connection_mode ?? 'automated') as IntegrationConnectionMode,
    authMethod: r.auth_method ?? undefined,
    description: r.description ?? undefined,
    dataFlows: Array.isArray(r.data_flows) ? r.data_flows : [],
    health: (r.health ?? 'unknown') as IntegrationHealth,
    direction: (r.direction ?? 'inbound') as IntegrationDirection,
    lastSyncAt: r.last_sync_at ?? null,
    connectedAt: r.connected_at ?? null,
    ownerName: r.owner_name ?? undefined,
    config: (r.config ?? {}) as Record<string, unknown>,
    catalogSlug: r.catalog_slug ?? null,
    lastRunStatus: r.last_run_status ?? null,
    lastRunError: r.last_run_error ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toRow(i: Partial<IntegrationRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  if (i.name !== undefined) row.name = i.name
  if (i.provider !== undefined) row.provider = i.provider ?? null
  if (i.category !== undefined) row.category = i.category
  if (i.status !== undefined) row.status = i.status
  if (i.connectionMode !== undefined) row.connection_mode = i.connectionMode
  if (i.authMethod !== undefined) row.auth_method = i.authMethod ?? null
  if (i.description !== undefined) row.description = i.description ?? null
  if (i.dataFlows !== undefined) row.data_flows = i.dataFlows
  if (i.health !== undefined) row.health = i.health
  if (i.direction !== undefined) row.direction = i.direction
  if (i.lastSyncAt !== undefined) row.last_sync_at = i.lastSyncAt || null
  if (i.connectedAt !== undefined) row.connected_at = i.connectedAt || null
  if (i.ownerName !== undefined) row.owner_name = i.ownerName ?? null
  if (i.config !== undefined) row.config = i.config
  if (i.catalogSlug !== undefined) row.catalog_slug = i.catalogSlug ?? null
  if (i.lastRunStatus !== undefined) row.last_run_status = i.lastRunStatus ?? null
  if (i.lastRunError !== undefined) row.last_run_error = i.lastRunError ?? null
  return row
}

export async function fetchIntegrations(): Promise<IntegrationRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('is_deleted', false)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []).map(fromRow)
}

export async function createIntegration(i: Partial<IntegrationRecord>): Promise<IntegrationRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase.from('integrations').insert(toRow(i)).select().single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'integrations', entityType: 'integrations', entityId: data.id, action: 'create' })
  return fromRow(data)
}

export async function updateIntegration(id: string, patch: Partial<IntegrationRecord>): Promise<IntegrationRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase
    .from('integrations')
    .update({ ...toRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'integrations', entityType: 'integrations', entityId: id, action: 'update' })
  return fromRow(data)
}

export async function softDeleteIntegration(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
  const { error } = await supabase
    .from('integrations')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({ module: 'integrations', entityType: 'integrations', entityId: id, action: 'delete' })
}

// ── Webhook endpoints ───────────────────────────────────────────────────────

export interface WebhookEndpoint {
  id: string
  url: string
  description?: string
  eventTypes: string[]
  secretPrefix?: string
  isActive: boolean
  failureCount: number
  lastSuccessAt?: string | null
  lastFailureAt?: string | null
  maxRetries: number
  timeoutSec: number
}

function webhookFromRow(r: Record<string, any>): WebhookEndpoint {
  return {
    id: r.id,
    url: r.url ?? '',
    description: r.description ?? undefined,
    eventTypes: Array.isArray(r.event_types) ? r.event_types : [],
    secretPrefix: r.secret_prefix ?? undefined,
    isActive: !!r.is_active,
    failureCount: r.failure_count ?? 0,
    lastSuccessAt: r.last_success_at ?? null,
    lastFailureAt: r.last_failure_at ?? null,
    maxRetries: r.max_retries ?? 5,
    timeoutSec: r.timeout_sec ?? 10,
  }
}

export async function fetchWebhooks(): Promise<WebhookEndpoint[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase.from('webhook_endpoints').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map(webhookFromRow)
}

/** Browser-side sha256 digest, hex encoded — matches the column's storage form. */
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Creates an endpoint and returns the signing secret ONCE — only its digest is
 * persisted, so the plaintext cannot be recovered afterwards.
 */
export async function createWebhook(
  input: { url: string; description?: string; eventTypes: string[]; maxRetries?: number; timeoutSec?: number },
): Promise<{ endpoint: WebhookEndpoint; secret: string }> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const raw = crypto.getRandomValues(new Uint8Array(24))
  const secret = `whsec_${Array.from(raw).map((b) => b.toString(16).padStart(2, '0')).join('')}`
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .insert({
      url: input.url,
      description: input.description ?? null,
      event_types: input.eventTypes,
      secret_hash: await sha256Hex(secret),
      secret_prefix: secret.slice(0, 11),
      is_active: true,
      max_retries: input.maxRetries ?? 5,
      timeout_sec: input.timeoutSec ?? 10,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'integrations', entityType: 'webhook_endpoints', entityId: data.id, action: 'create' })
  return { endpoint: webhookFromRow(data), secret }
}

export async function setWebhookActive(id: string, isActive: boolean): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { error } = await supabase
    .from('webhook_endpoints')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({ module: 'integrations', entityType: 'webhook_endpoints', entityId: id, action: 'update' })
}

export async function deleteWebhook(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
  const { error } = await supabase.from('webhook_endpoints').delete().eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({ module: 'integrations', entityType: 'webhook_endpoints', entityId: id, action: 'delete' })
}
