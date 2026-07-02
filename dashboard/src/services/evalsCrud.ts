// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Generic CRUD for Validation & Evals aggregate roots. Mirrors the existing
// service style (biasAuditService.ts): guarded by isSupabaseConfigured(),
// tenant-scoped, soft-delete aware, seed-fallback friendly (returns [] when
// unconfigured so hooks can fall back to seed data). Persists the whole entity
// in a `doc` jsonb column; a few first-class columns are kept for indexing.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

const TENANT_ID = 'default'

/** Row envelope written to Supabase. `doc` holds the full typed entity. */
interface Row {
  id: string
  doc: Record<string, unknown>
  state?: string | null
  model_id?: string | null
  version?: number
  updated_at?: string
}

/** Flatten a persisted row back into its typed entity. */
function fromRow<T>(r: Row): T {
  return { ...(r.doc as object), id: r.id, version: r.version } as T
}

export interface EvalsCrud<T extends { id: string }> {
  table: string
  module: string
  list(): Promise<T[]>
  get(id: string): Promise<T | null>
  upsert(rec: T): Promise<T>
  softDelete(id: string): Promise<boolean>
}

export function makeCrud<T extends { id: string; state?: string; modelId?: string; version?: number }>(
  table: string,
  module: string,
): EvalsCrud<T> {
  return {
    table,
    module,

    async list(): Promise<T[]> {
      if (!isSupabaseConfigured() || !supabase) return []
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id, doc, state, model_id, version, updated_at')
          .eq('tenant_id', TENANT_ID)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
        if (error) { console.warn(`[${module}] list failed:`, error.message); return [] }
        return (data ?? []).map((r) => fromRow<T>(r as Row))
      } catch { return [] }
    },

    async get(id: string): Promise<T | null> {
      if (!isSupabaseConfigured() || !supabase) return null
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id, doc, state, model_id, version, updated_at')
          .eq('id', id)
          .eq('tenant_id', TENANT_ID)
          .is('deleted_at', null)
          .single()
        if (error) return null
        return fromRow<T>(data as Row)
      } catch { return null }
    },

    async upsert(rec: T): Promise<T> {
      if (!isSupabaseConfigured() || !supabase) return rec
      try {
        const { version, ...doc } = rec
        const { data, error } = await supabase
          .from(table)
          .upsert({
            id: rec.id,
            tenant_id: TENANT_ID,
            doc,
            state: rec.state ?? null,
            model_id: rec.modelId ?? null,
            version: (version ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .select('id, doc, state, model_id, version, updated_at')
          .single()
        if (error) { console.warn(`[${module}] upsert failed:`, error.message); return rec }
        void logAction({ module, entityType: table, entityId: rec.id, action: version ? 'update' : 'create' })
        return fromRow<T>(data as Row)
      } catch { return rec }
    },

    async softDelete(id: string): Promise<boolean> {
      if (!isSupabaseConfigured() || !supabase) return false
      try {
        const { error } = await supabase
          .from(table)
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id)
          .eq('tenant_id', TENANT_ID)
        if (error) { console.warn(`[${module}] delete failed:`, error.message); return false }
        void logAction({ module, entityType: table, entityId: id, action: 'delete' })
        return true
      } catch { return false }
    },
  }
}

// One CRUD client per aggregate root ---------------------------------------
import type {
  ValidationRun, ExplainabilityProfile, BiasAudit, MetricProfile,
  DatasetCatalogEntry, ScenarioTemplate, ScenarioCampaign, SessionTrace,
  MonitoringConfig,
} from '../types/evals'

export const validationRunsCrud   = makeCrud<ValidationRun>('validation_runs', 'model-validation')
export const explainProfilesCrud  = makeCrud<ExplainabilityProfile>('explainability_profiles', 'explainability')
export const biasAuditsCrud       = makeCrud<BiasAudit>('bias_audit_records', 'bias-audits')
export const metricProfilesCrud   = makeCrud<MetricProfile>('metric_profiles', 'metric-studio')
export const datasetCatalogCrud   = makeCrud<DatasetCatalogEntry>('dataset_catalog_entries', 'dataset-wizard')
export const scenarioTemplatesCrud = makeCrud<ScenarioTemplate>('scenario_templates', 'scenario-editor')
export const scenarioCampaignsCrud = makeCrud<ScenarioCampaign>('scenario_campaigns', 'scenario-editor')
export const sessionTracesCrud    = makeCrud<SessionTrace>('session_traces', 'session-trace')
export const monitoringConfigsCrud = makeCrud<MonitoringConfig>('eval_monitoring_configs', 'monitoring')
