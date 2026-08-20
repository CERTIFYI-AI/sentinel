// SPDX-License-Identifier: Apache-2.0
// Controls on the platform contract (CLAUDE.md): the real org-scoped
// `controls` table under RLS — no tenant stamping from the client (the DB
// default fills tenant_id), no seed fallbacks, and every failure THROWS so
// the UI can never report a false success. camelCase↔snake_case mapping at
// this boundary over the rich column set.
import { supabase, isSupabaseConfigured } from '../lib/supabase'

function client() {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — control data is unavailable')
  }
  return supabase
}

export interface ControlRecord {
  id?: string                  // uuid PK
  controlCode?: string         // business code column control_id (e.g. GOV-01)
  controlRef?: string
  name: string
  title?: string
  framework?: string
  frameworkId?: string | null  // → frameworks.id
  domain?: string
  category?: string
  clauseRef?: string | null    // read: clause_ref ?? clause_reference ?? clause
  description?: string
  requirement?: string
  implementationGuidance?: string
  status?: string
  implementationStatus?: string
  priority?: string
  riskLevel?: string
  severity?: string | null
  evaluationType?: string | null
  score?: number
  effectivenessScore?: number
  owner?: string | null
  frequency?: string | null
  testFrequency?: string | null
  dueDate?: string | null
  evidenceCount?: number
  lastTestedAt?: string | null
  nextTestAt?: string | null
  testResult?: string | null
  remediationPlan?: string | null
  remediationDeadline?: string | null
  linkedModelIds?: string[]    // → ai_models.id
  linkedRiskIds?: string[]     // → risks.id
  linkedPolicyIds?: string[]   // → policies.id
  tags?: string[]
  isDeleted?: boolean
  createdAt?: string
  updatedAt?: string
  // Raw-row compat for legacy readers that index rows by snake_case
  // (e.g. control_ref lookups) — populated on read, never written back.
  control_ref?: string | null
}

const mapControl = (r: any): ControlRecord => ({
  id: r.id,
  controlCode: r.control_id ?? undefined,
  controlRef: r.control_ref ?? r.control_id ?? undefined,
  name: r.name ?? r.title ?? '',
  title: r.title ?? r.name ?? undefined,
  framework: r.framework ?? undefined,
  frameworkId: r.framework_id ?? null,
  domain: r.domain ?? undefined,
  category: r.category ?? undefined,
  clauseRef: r.clause_ref ?? r.clause_reference ?? r.clause ?? null,
  description: r.description ?? undefined,
  requirement: r.requirement ?? undefined,
  implementationGuidance: r.implementation_guidance ?? undefined,
  status: r.status ?? undefined,
  implementationStatus: r.implementation_status ?? undefined,
  priority: r.priority ?? undefined,
  riskLevel: r.risk_level ?? undefined,
  severity: r.severity ?? null,
  evaluationType: r.evaluation_type ?? null,
  score: r.score != null ? Number(r.score) : undefined,
  effectivenessScore: r.effectiveness_score != null ? Number(r.effectiveness_score) : undefined,
  owner: r.owner ?? null,
  frequency: r.frequency ?? null,
  testFrequency: r.test_frequency ?? null,
  dueDate: r.due_date ?? null,
  evidenceCount: r.evidence_count != null ? Number(r.evidence_count) : undefined,
  lastTestedAt: r.last_tested_at ?? null,
  nextTestAt: r.next_test_at ?? null,
  testResult: r.test_result ?? null,
  remediationPlan: r.remediation_plan ?? null,
  remediationDeadline: r.remediation_deadline ?? null,
  linkedModelIds: r.linked_model_ids ?? [],
  linkedRiskIds: r.linked_risk_ids ?? [],
  linkedPolicyIds: r.linked_policy_ids ?? [],
  tags: r.tags ?? [],
  isDeleted: r.is_deleted ?? false,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  control_ref: r.control_ref ?? r.control_id ?? null,
})

export async function fetchAllControls(): Promise<ControlRecord[]> {
  // The library is >1,000 rows (all 15 frameworks); PostgREST caps a single
  // select at 1,000 and truncates SILENTLY, so page explicitly until a short
  // page comes back.
  const PAGE = 1000
  const all: any[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client()
      .from('controls')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) {
      console.warn('[controlService] fetch failed: %s', error.message)
      throw new Error(`Could not load controls: ${error.message}`)
    }
    all.push(...(data ?? []))
    if ((data ?? []).length < PAGE) break
  }
  return all.filter((r: any) => !r.is_deleted).map(mapControl)
}

export async function upsertControl(c: Partial<ControlRecord>): Promise<ControlRecord> {
  const row: Record<string, unknown> = {
    id: c.id,
    control_id: c.controlCode,
    control_ref: c.controlRef,
    name: c.name ?? c.title,
    title: c.title ?? c.name,
    framework: c.framework,
    framework_id: c.frameworkId,
    domain: c.domain,
    category: c.category,
    clause_ref: c.clauseRef,
    description: c.description,
    requirement: c.requirement,
    implementation_guidance: c.implementationGuidance,
    status: c.status,
    implementation_status: c.implementationStatus,
    priority: c.priority,
    risk_level: c.riskLevel,
    severity: c.severity,
    evaluation_type: c.evaluationType,
    score: c.score,
    effectiveness_score: c.effectivenessScore,
    owner: c.owner,
    frequency: c.frequency,
    test_frequency: c.testFrequency,
    due_date: c.dueDate,
    evidence_count: c.evidenceCount,
    last_tested_at: c.lastTestedAt,
    next_test_at: c.nextTestAt,
    test_result: c.testResult,
    remediation_plan: c.remediationPlan,
    remediation_deadline: c.remediationDeadline,
    linked_model_ids: c.linkedModelIds,
    linked_risk_ids: c.linkedRiskIds,
    linked_policy_ids: c.linkedPolicyIds,
    tags: c.tags,
    updated_at: new Date().toISOString(),
  }
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k])
  const { data, error } = await client().from('controls').upsert(row).select().single()
  if (error) {
    console.warn('[controlService] upsert failed: %s', error.message)
    throw new Error(`The control did not persist: ${error.message}`)
  }
  return mapControl(data)
}

export async function deleteControl(id: string): Promise<void> {
  const { error } = await client().from('controls').delete().eq('id', id)
  if (error) {
    console.warn('[controlService] delete failed: %s', error.message)
    throw new Error(`Delete failed: ${error.message}`)
  }
}

// Backward-compatible aliases (existing hooks/pages import these names).
export const fetchControls = fetchAllControls
export const saveControl = upsertControl
