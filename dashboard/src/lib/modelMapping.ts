// SPDX-License-Identifier: Apache-2.0
// Shared mapping between the UI `Model` view-shape and the `ai_models` DB row.
// Both the Model Registry list and the Model detail page use these so the
// column/enum translation lives in exactly one place.

import type { Model } from '@/data/seed'
import type { ModelRecord } from '@/services/modelService'

const DRIFT_STATES = ['stable', 'warning', 'critical'] as const

// DB risk_tier enum {critical,high,medium,low,minimal} ⇄ UI {unacceptable,high,limited,minimal}
const DB_RISK_TO_UI: Record<string, Model['riskTier']> = {
  critical: 'unacceptable', high: 'high', medium: 'limited', low: 'minimal', minimal: 'minimal',
}
const UI_RISK_TO_DB: Record<string, string> = {
  unacceptable: 'critical', high: 'high', limited: 'medium', minimal: 'minimal',
}

// DB model_type enum → human label for the table.
const TYPE_TO_LABEL: Record<string, string> = {
  llm: 'LLM', classification: 'ML — Classification', regression: 'ML — Regression',
  nlp: 'NLP', vision: 'Computer Vision', multimodal: 'Multimodal', rl: 'Reinforcement Learning', other: 'Other',
}

const LIFECYCLE_TO_STATUS: Record<string, Model['status']> = {
  production: 'production', prod: 'production', monitor: 'production', monitoring: 'production',
  staging: 'staging', stage: 'staging', testing: 'staging', test: 'staging', review: 'staging',
  dev: 'development', development: 'development', research: 'development',
  deprecated: 'retired', retired: 'retired',
}
const STATUS_TO_LIFECYCLE: Record<Model['status'], string> = {
  production: 'production', staging: 'staging', development: 'development', retired: 'deprecated',
}

/** Supabase `ai_models` row → rich UI `Model`. Nested analytics fields the
 *  registry table doesn't store default to empty so detail panels render
 *  gracefully rather than crashing. */
export function recordToModel(r: ModelRecord): Model {
  const tier = (r.risk_tier ?? '').toLowerCase()
  const stage = (r.lifecycle_stage ?? '').toLowerCase()
  const drift = (r.drift_status ?? '').toLowerCase()
  const meta = r.metadata ?? {}
  return {
    id: r.id, name: r.name, version: r.version ?? '—',
    type: TYPE_TO_LABEL[(r.model_type ?? '').toLowerCase()] ?? r.model_type ?? '—',
    owner: r.business_owner ?? r.technical_owner ?? '—',
    status: LIFECYCLE_TO_STATUS[stage] ?? 'production',
    riskTier: DB_RISK_TO_UI[tier] ?? 'limited',
    fairnessScore: r.fairness_score ?? 0,
    driftStatus: (DRIFT_STATES as readonly string[]).includes(drift) ? (drift as Model['driftStatus']) : 'stable',
    lastValidated: (r.updated_at ?? r.created_at ?? '').slice(0, 10),
    framework: r.framework ?? (meta.euAiActArticle ? 'EU AI Act' : '—'),
    department: meta.department ?? '—', description: r.description ?? '',
    accuracy: 0, latencyMs: 0, monthlyInferences: '—', euAiActArticle: meta.euAiActArticle ?? '—',
    biasMetrics: [], performanceHistory: [], guardrails: [], complianceMapping: [], incidents: [],
    lifecyclePhase: r.lifecycle_stage ?? '—', daysInPhase: 0, lifecycleProgress: 0,
  }
}

function slugify(s: string): string {
  return (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'model'
}
// UI values → DB enums, honoring the ai_models CHECK constraints.
function normModelType(t: string): string {
  const s = (t || '').toLowerCase()
  if (s.includes('llm')) return 'llm'
  if (s.includes('regress')) return 'regression'
  if (s.includes('classif')) return 'classification'
  if (s.includes('nlp')) return 'nlp'
  if (s.includes('vision')) return 'vision'
  if (s.includes('multimodal')) return 'multimodal'
  if (s.includes('reinforc') || s === 'rl') return 'rl'
  return 'other'
}
function normDeploymentEnv(e?: string): string | undefined {
  const s = (e || '').toLowerCase()
  if (!s) return undefined
  if (s.includes('premise') || s.includes('on-prem')) return 'on-premise'
  if (s.includes('hybrid')) return 'hybrid'
  if (s.includes('edge')) return 'edge'
  return 'cloud'
}

/** UI `Model` → `ai_models` columns. Extended governance fields the table has no
 *  dedicated column for are folded into `metadata` (jsonb). `id` is omitted so
 *  callers add it only for updates (creates get a DB-generated uuid). */
export function modelToRecord(m: Model): Partial<ModelRecord> {
  const mx = m as Model & Record<string, any>
  return {
    name: m.name,
    slug: slugify(`${m.name}-${m.version ?? ''}`),
    version: m.version,
    model_type: normModelType(m.type),
    provider: mx.provider || undefined,
    lifecycle_stage: STATUS_TO_LIFECYCLE[m.status] ?? 'development',
    risk_tier: UI_RISK_TO_DB[m.riskTier] ?? 'medium',
    business_owner: mx.businessOwner || m.owner,
    technical_owner: mx.technicalOwner || undefined,
    deployment_env: normDeploymentEnv(mx.deploymentEnv),
    framework: m.framework && m.framework !== '—' ? m.framework : undefined,
    description: m.description || undefined,
    fairness_score: m.fairnessScore || undefined,
    drift_status: m.driftStatus || 'stable',
    metadata: {
      department: m.department && m.department !== '—' ? m.department : undefined,
      dataClassification: mx.dataClassification,
      intendedPurpose: mx.intendedPurpose,
      knownLimitations: mx.knownLimitations,
      trainingDataSources: mx.trainingDataSources,
      humanOversight: mx.humanOversight,
      euAiActArticle: m.euAiActArticle && m.euAiActArticle !== '—' ? m.euAiActArticle : undefined,
    },
  }
}
