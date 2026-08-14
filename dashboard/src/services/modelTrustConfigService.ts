// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Per-model trust configuration service — direct Supabase access to the
// org-scoped `model_trust_configs` table (RLS + org default via
// current_user_org_id(); the client never sends org_id). model_id and
// fallback_model_id are canonical ai_models.id uuids — names are resolved at
// render time. Platform contract: writes THROW on failure so the UI can never
// report a false success.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

export interface ModelTrustConfig {
  id: string
  /** Canonical ai_models.id (uuid). */
  modelId: string
  toxicityThreshold: number
  hallucinationThreshold: number
  piiDetectionEnabled: boolean
  jailbreakDetection: boolean
  outputFiltering: boolean
  costAlertUsd: number | null
  tokenLimitPerReq: number
  rateLimitRpm: number
  /** Canonical ai_models.id (uuid) or null. */
  fallbackModelId: string | null
  customRules: unknown[]
  allowedTopics: string[]
  blockedTopics: string[]
  createdAt?: string
  updatedAt?: string
}

interface ConfigRow {
  id: string
  model_id: string
  toxicity_threshold: number | string
  hallucination_threshold: number | string
  pii_detection_enabled: boolean
  jailbreak_detection: boolean
  output_filtering: boolean
  cost_alert_usd: number | string | null
  token_limit_per_req: number
  rate_limit_rpm: number
  fallback_model_id: string | null
  custom_rules: unknown[] | null
  allowed_topics: string[] | null
  blocked_topics: string[] | null
  created_at?: string
  updated_at?: string
}

function fromRow(r: ConfigRow): ModelTrustConfig {
  return {
    id: r.id,
    modelId: r.model_id,
    toxicityThreshold: Number(r.toxicity_threshold),
    hallucinationThreshold: Number(r.hallucination_threshold),
    piiDetectionEnabled: r.pii_detection_enabled,
    jailbreakDetection: r.jailbreak_detection,
    outputFiltering: r.output_filtering,
    costAlertUsd: r.cost_alert_usd === null || r.cost_alert_usd === undefined ? null : Number(r.cost_alert_usd),
    tokenLimitPerReq: r.token_limit_per_req,
    rateLimitRpm: r.rate_limit_rpm,
    fallbackModelId: r.fallback_model_id ?? null,
    customRules: r.custom_rules ?? [],
    allowedTopics: r.allowed_topics ?? [],
    blockedTopics: r.blocked_topics ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toRow(c: Partial<ModelTrustConfig>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (c.modelId !== undefined) row.model_id = c.modelId
  if (c.toxicityThreshold !== undefined) row.toxicity_threshold = c.toxicityThreshold
  if (c.hallucinationThreshold !== undefined) row.hallucination_threshold = c.hallucinationThreshold
  if (c.piiDetectionEnabled !== undefined) row.pii_detection_enabled = c.piiDetectionEnabled
  if (c.jailbreakDetection !== undefined) row.jailbreak_detection = c.jailbreakDetection
  if (c.outputFiltering !== undefined) row.output_filtering = c.outputFiltering
  if (c.costAlertUsd !== undefined) row.cost_alert_usd = c.costAlertUsd
  if (c.tokenLimitPerReq !== undefined) row.token_limit_per_req = c.tokenLimitPerReq
  if (c.rateLimitRpm !== undefined) row.rate_limit_rpm = c.rateLimitRpm
  if (c.fallbackModelId !== undefined) row.fallback_model_id = c.fallbackModelId
  if (c.customRules !== undefined) row.custom_rules = c.customRules
  if (c.allowedTopics !== undefined) row.allowed_topics = c.allowedTopics
  if (c.blockedTopics !== undefined) row.blocked_topics = c.blockedTopics
  return row
}

export async function fetchModelTrustConfigs(): Promise<ModelTrustConfig[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('model_trust_configs')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) { console.warn('[modelTrustConfigService] list:', error.message); throw new Error(error.message) }
  return ((data ?? []) as ConfigRow[]).map(fromRow)
}

// Writes throw on failure (config/RLS/CHECK/network) so callers surface a real
// error toast instead of a false success.
export async function upsertModelTrustConfig(rec: Partial<ModelTrustConfig>): Promise<ModelTrustConfig> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save model trust config.')
  if (!rec.id && !rec.modelId) throw new Error('A registry model is required.')
  const row = toRow(rec)
  const q = rec.id
    ? supabase.from('model_trust_configs').update({ ...row, updated_at: new Date().toISOString() }).eq('id', rec.id)
    : supabase.from('model_trust_configs').insert(row)
  const { data, error } = await q.select().single()
  if (error) { console.warn('[modelTrustConfigService] upsert:', error.message); throw new Error(error.message) }
  const saved = fromRow(data as ConfigRow)
  void logAction({
    module: 'trust-config', entityType: 'model_trust_configs', entityId: saved.id,
    action: rec.id ? 'update' : 'create', newValues: row,
  })
  return saved
}

export async function deleteModelTrustConfig(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete model trust config.')
  const { error } = await supabase.from('model_trust_configs').delete().eq('id', id)
  if (error) { console.warn('[modelTrustConfigService] delete:', error.message); throw new Error(error.message) }
  void logAction({ module: 'trust-config', entityType: 'model_trust_configs', entityId: id, action: 'delete' })
}
