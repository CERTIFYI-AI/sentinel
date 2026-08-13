// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Generic CRUD for Validation & Evals aggregate roots, on the platform
// contract (see CLAUDE.md): org-scoped via RLS + DB default (the client never
// sends a tenant column), writes THROW on failure so the UI can never report a
// false success, and reads throw so callers can render real error states.
// Persists the whole entity in a `doc` jsonb column with first-class columns
// (state, model_id) for indexing and interlink. model_id is the canonical
// ai_models.id (uuid).

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

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
  softDelete(id: string): Promise<void>
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
      const { data, error } = await supabase
        .from(table)
        .select('id, doc, state, model_id, version, updated_at')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
      if (error) { console.warn(`[${module}] list:`, error.message); throw new Error(error.message) }
      return (data ?? []).map((r) => fromRow<T>(r as Row))
    },

    async get(id: string): Promise<T | null> {
      if (!isSupabaseConfigured() || !supabase) return null
      const { data, error } = await supabase
        .from(table)
        .select('id, doc, state, model_id, version, updated_at')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle()
      if (error) { console.warn(`[${module}] get:`, error.message); throw new Error(error.message) }
      return data ? fromRow<T>(data as Row) : null
    },

    // Throws on any failure (config / RLS / network) so callers surface a real
    // error toast — never a false success. org_id is filled by the DB default.
    async upsert(rec: T): Promise<T> {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
      const { version, ...doc } = rec
      const { data, error } = await supabase
        .from(table)
        .upsert({
          id: rec.id,
          doc,
          state: rec.state ?? null,
          model_id: rec.modelId ?? null,
          version: (version ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .select('id, doc, state, model_id, version, updated_at')
        .single()
      if (error) { console.warn(`[${module}] upsert:`, error.message); throw new Error(error.message) }
      void logAction({ module, entityType: table, entityId: rec.id, action: version ? 'update' : 'create' })
      return fromRow<T>(data as Row)
    },

    async softDelete(id: string): Promise<void> {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) { console.warn(`[${module}] delete:`, error.message); throw new Error(error.message) }
      void logAction({ module, entityType: table, entityId: id, action: 'delete' })
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
