// SPDX-License-Identifier: Apache-2.0
// Model Detail service — reads/writes the RLS-governed per-model backend tables
// (model_documents, model_activity, model_alert_configs). org_id is filled by
// each table's get_org_id() default on insert. Writes throw on failure so the
// UI surfaces a real error instead of a false success.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface ModelDocument {
  id: string
  modelId: string
  title: string
  docType: string
  url: string
  description?: string
  createdBy?: string
  createdAt: string
}
export interface ModelActivity {
  id: string
  modelId: string
  event: string
  actor?: string
  kind: 'info' | 'success' | 'warning' | 'error'
  createdAt: string
}
export interface AlertConfig {
  modelId: string
  fairnessThreshold: number
  driftThreshold: number
  channels: { email: boolean; slack: boolean; pagerduty: boolean }
}

// ── Documents ──────────────────────────────────────────────────────────────
export async function fetchModelDocuments(modelId: string): Promise<ModelDocument[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('model_documents').select('*').eq('model_id', modelId)
    .order('created_at', { ascending: false })
  if (error) { console.warn('[modelDetailService] docs fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(r => ({
    id: r.id, modelId: r.model_id, title: r.title, docType: r.doc_type,
    url: r.url, description: r.description ?? undefined, createdBy: r.created_by ?? undefined,
    createdAt: r.created_at,
  }))
}

export async function addModelDocument(doc: Omit<ModelDocument, 'id' | 'createdAt'>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot link document.')
  const { error } = await supabase.from('model_documents').insert({
    model_id: doc.modelId, title: doc.title, doc_type: doc.docType,
    url: doc.url, description: doc.description ?? null, created_by: doc.createdBy ?? null,
  })
  if (error) { console.warn('[modelDetailService] docs insert:', error.message); throw new Error(error.message) }
}

export async function deleteModelDocument(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot remove document.')
  const { error } = await supabase.from('model_documents').delete().eq('id', id)
  if (error) { console.warn('[modelDetailService] docs delete:', error.message); throw new Error(error.message) }
}

// ── Activity ───────────────────────────────────────────────────────────────
export async function fetchModelActivity(modelId: string): Promise<ModelActivity[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('model_activity').select('*').eq('model_id', modelId)
    .order('created_at', { ascending: false })
  if (error) { console.warn('[modelDetailService] activity fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(r => ({
    id: r.id, modelId: r.model_id, event: r.event, actor: r.actor ?? undefined,
    kind: r.kind, createdAt: r.created_at,
  }))
}

export async function logModelActivity(a: Omit<ModelActivity, 'id' | 'createdAt'>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot record activity.')
  const { error } = await supabase.from('model_activity').insert({
    model_id: a.modelId, event: a.event, actor: a.actor ?? null, kind: a.kind,
  })
  if (error) { console.warn('[modelDetailService] activity insert:', error.message); throw new Error(error.message) }
}

// ── Alert config ────────────────────────────────────────────────────────────
export async function fetchAlertConfig(modelId: string): Promise<AlertConfig | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data, error } = await supabase
    .from('model_alert_configs').select('*').eq('model_id', modelId).maybeSingle()
  if (error) { console.warn('[modelDetailService] alert fetch:', error.message); throw new Error(error.message) }
  if (!data) return null
  return {
    modelId: data.model_id,
    fairnessThreshold: data.fairness_threshold,
    driftThreshold: data.drift_threshold,
    channels: data.channels ?? { email: true, slack: false, pagerduty: false },
  }
}

export async function saveAlertConfig(cfg: AlertConfig): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save alert configuration.')
  const { error } = await supabase.from('model_alert_configs').upsert({
    model_id: cfg.modelId,
    fairness_threshold: cfg.fairnessThreshold,
    drift_threshold: cfg.driftThreshold,
    channels: cfg.channels,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'model_id' })
  if (error) { console.warn('[modelDetailService] alert upsert:', error.message); throw new Error(error.message) }
}
