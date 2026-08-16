// SPDX-License-Identifier: Apache-2.0
// Regulatory-operations cluster on the platform contract (CLAUDE.md):
// regulator_filings, transparency_reports, post_market_plans/_events and the
// read-only policy_templates catalog. camelCase↔snake_case mapping at this
// boundary, writes THROW on failure, the client never sends org_id (DB
// defaults fill it under RLS). Post-market escalation reuses the real
// incident pipeline (incidentResponseService.saveIncident) — one id-space.
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { saveIncident } from './incidentResponseService'
import { upsertPolicy, savePolicyVersion, type PolicyRecord } from './policyService'

function client() {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — regulatory data is unavailable')
  }
  return supabase
}

async function selectAll<T>(table: string, mapper: (r: any) => T, order = 'created_at'): Promise<T[]> {
  const { data, error } = await client().from(table).select('*').order(order, { ascending: false })
  if (error) {
    console.warn('[regulatoryOpsService] fetch %s failed: %s', table, error.message)
    throw new Error(`Could not load ${table.replace(/_/g, ' ')}: ${error.message}`)
  }
  return (data ?? []).map(mapper)
}

async function upsertRow<T>(table: string, row: Record<string, unknown>, mapper: (r: any) => T): Promise<T> {
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k])
  const { data, error } = await client().from(table).upsert(row).select().single()
  if (error) {
    console.warn('[regulatoryOpsService] upsert %s failed: %s', table, error.message)
    throw new Error(`The write to ${table.replace(/_/g, ' ')} did not persist: ${error.message}`)
  }
  return mapper(data)
}

async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await client().from(table).delete().eq('id', id)
  if (error) {
    console.warn('[regulatoryOpsService] delete %s failed: %s', table, error.message)
    throw new Error(`Delete from ${table.replace(/_/g, ' ')} failed: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// Regulator filings (DB CHECKs: regulation NIS2|DORA|GDPR-33|GDPR-34|
// EU-AI-Act-73|SEC-1.05|FCA|PRA|Other; type breach_notification|
// incident_report|annual_report|adhoc; status draft|in_review|submitted|
// acknowledged|closed)
// ---------------------------------------------------------------------------
export const FILING_REGULATIONS = ['NIS2', 'DORA', 'GDPR-33', 'GDPR-34', 'EU-AI-Act-73', 'SEC-1.05', 'FCA', 'PRA', 'Other'] as const
export const FILING_TYPES = ['breach_notification', 'incident_report', 'annual_report', 'adhoc'] as const
export const FILING_STATUSES = ['draft', 'in_review', 'submitted', 'acknowledged', 'closed'] as const

export interface FilingRecord {
  id?: string
  filingRef?: string
  title: string
  regulation: string           // one of FILING_REGULATIONS
  type?: string                // one of FILING_TYPES
  status: string               // one of FILING_STATUSES
  deadline?: string | null
  submittedAt?: string | null
  linkedIncidentId?: string | null // → incidents.id
  regulatorName?: string | null
  regulatorContact?: string | null
  referenceNumber?: string | null
  content?: Record<string, unknown>
  attachments?: string[]
  createdAt?: string
  updatedAt?: string
}

const mapFiling = (r: any): FilingRecord => ({
  id: r.id,
  filingRef: r.filing_ref ?? undefined,
  title: r.title ?? '',
  regulation: r.regulation ?? 'Other',
  type: r.type ?? undefined,
  status: (r.status ?? 'draft').toLowerCase(),
  deadline: r.deadline ?? null,
  submittedAt: r.submitted_at ?? null,
  linkedIncidentId: r.linked_incident_id ?? null,
  regulatorName: r.regulator_name ?? null,
  regulatorContact: r.regulator_contact ?? null,
  referenceNumber: r.reference_number ?? null,
  content: r.content ?? {},
  attachments: r.attachments ?? [],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

export const fetchFilings = () => selectAll('regulator_filings', mapFiling)
export const saveFiling = (f: FilingRecord) =>
  upsertRow('regulator_filings', {
    id: f.id,
    filing_ref: f.filingRef,
    title: f.title,
    regulation: f.regulation,
    type: f.type,
    status: f.status?.toLowerCase(),
    deadline: f.deadline,
    submitted_at: f.submittedAt,
    linked_incident_id: f.linkedIncidentId || null,
    regulator_name: f.regulatorName,
    regulator_contact: f.regulatorContact,
    reference_number: f.referenceNumber,
    content: f.content,
    attachments: f.attachments,
    updated_at: new Date().toISOString(),
  }, mapFiling)
export const deleteFiling = (id: string) => deleteRow('regulator_filings', id)

// ---------------------------------------------------------------------------
// Transparency reports (mesh-written table; model_id → ai_models.id)
// ---------------------------------------------------------------------------
export interface TransparencyReportRecord {
  id?: string
  reportType?: string
  audience?: string
  title: string
  status: string
  generatedBy?: string | null
  content?: string | null
  eventId?: string | null
  modelId?: string | null      // → ai_models.id
  version?: string | null
  publishedAt?: string | null
  url?: string | null
  createdAt?: string
}

const mapTransparencyReport = (r: any): TransparencyReportRecord => ({
  id: r.id,
  reportType: r.report_type ?? undefined,
  audience: r.audience ?? undefined,
  title: r.title ?? '',
  status: r.status ?? 'DRAFT',
  generatedBy: r.generated_by ?? null,
  content: r.content ?? null,
  eventId: r.event_id ?? null,
  modelId: r.model_id ?? null,
  version: r.version ?? null,
  publishedAt: r.published_at ?? null,
  url: r.url ?? null,
  createdAt: r.created_at,
})

export const fetchTransparencyReports = () => selectAll('transparency_reports', mapTransparencyReport)
export const saveTransparencyReport = (t: TransparencyReportRecord) =>
  upsertRow('transparency_reports', {
    id: t.id,
    report_type: t.reportType,
    audience: t.audience,
    title: t.title,
    status: t.status,
    generated_by: t.generatedBy,
    content: t.content,
    event_id: t.eventId,
    model_id: t.modelId || null,
    version: t.version,
    published_at: t.publishedAt,
    url: t.url,
  }, mapTransparencyReport)
export const deleteTransparencyReport = (id: string) => deleteRow('transparency_reports', id)

// ---------------------------------------------------------------------------
// Post-market monitoring (EU AI Act Art. 72): plans + events. Events can
// escalate into the real incident pipeline — never a parallel one.
// ---------------------------------------------------------------------------
export interface PostMarketMetric { name: string; threshold: number; direction: string }

export interface PostMarketPlanRecord {
  id?: string
  planRef?: string
  modelId?: string | null      // → ai_models.id
  name: string
  status: string               // active | paused | retired
  frequency?: string | null    // continuous | weekly | monthly | quarterly
  metrics: PostMarketMetric[]
  owner?: string | null
  lastReview?: string | null
  nextReview?: string | null
  createdAt?: string
  updatedAt?: string
}

const mapPlan = (r: any): PostMarketPlanRecord => ({
  id: r.id,
  planRef: r.plan_ref ?? undefined,
  modelId: r.model_id ?? null,
  name: r.name ?? '',
  status: (r.status ?? 'active').toLowerCase(),
  frequency: r.frequency ?? null,
  metrics: Array.isArray(r.metrics) ? r.metrics : [],
  owner: r.owner ?? null,
  lastReview: r.last_review ?? null,
  nextReview: r.next_review ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

export const fetchPostMarketPlans = () => selectAll('post_market_plans', mapPlan)
export const savePostMarketPlan = (p: PostMarketPlanRecord) =>
  upsertRow('post_market_plans', {
    id: p.id,
    plan_ref: p.planRef,
    model_id: p.modelId || null,
    name: p.name,
    status: p.status?.toLowerCase(),
    frequency: p.frequency,
    metrics: p.metrics,
    owner: p.owner,
    last_review: p.lastReview,
    next_review: p.nextReview,
    updated_at: new Date().toISOString(),
  }, mapPlan)
export const deletePostMarketPlan = (id: string) => deleteRow('post_market_plans', id)

export interface PostMarketEventRecord {
  id?: string
  planId?: string | null       // → post_market_plans.id
  incidentId?: string | null   // → incidents.id when escalated
  severity?: string | null
  eventType?: string | null    // metric_breach | complaint | drift | recall_check
  description?: string | null
  occurredAt?: string
  resolved: boolean
}

const mapEvent = (r: any): PostMarketEventRecord => ({
  id: r.id,
  planId: r.plan_id ?? null,
  incidentId: r.incident_id ?? null,
  severity: r.severity ?? null,
  eventType: r.event_type ?? null,
  description: r.description ?? null,
  occurredAt: r.occurred_at,
  resolved: !!r.resolved,
})

export async function fetchPostMarketEvents(planId?: string): Promise<PostMarketEventRecord[]> {
  let q = client().from('post_market_events').select('*').order('occurred_at', { ascending: false })
  if (planId) q = q.eq('plan_id', planId)
  const { data, error } = await q
  if (error) {
    console.warn('[regulatoryOpsService] fetch %s failed: %s', 'post_market_events', error.message)
    throw new Error(`Could not load post-market events: ${error.message}`)
  }
  return (data ?? []).map(mapEvent)
}

// With escalateToIncident=true a REAL incident is declared through
// incidentResponseService.saveIncident (which also emits INCIDENT_CREATED on
// the governance bus) and the event is stamped with its uuid.
export async function savePostMarketEvent(
  e: PostMarketEventRecord,
  escalateToIncident = false,
): Promise<PostMarketEventRecord> {
  let incidentId = e.incidentId ?? null
  if (escalateToIncident && !incidentId) {
    // Interlink: carry the plan's model into the incident when it has one.
    let modelId: string | null = null
    if (e.planId) {
      const { data, error } = await client()
        .from('post_market_plans')
        .select('model_id, name')
        .eq('id', e.planId)
        .maybeSingle()
      if (error) {
        console.warn('[regulatoryOpsService] plan lookup failed: %s', error.message)
        throw new Error(`Could not resolve the monitoring plan for escalation: ${error.message}`)
      }
      modelId = data?.model_id ?? null
    }
    const incident = await saveIncident({
      title: `Post-market event${e.eventType ? ` (${e.eventType.replace(/_/g, ' ')})` : ''}: ${e.description ?? 'unspecified'}`.slice(0, 300),
      description: e.description ?? undefined,
      severity: (e.severity ?? 'medium').toLowerCase(),
      status: 'open',
      source: 'post_market_monitoring',
      incidentType: e.eventType ?? undefined,
      modelId,
      detectionMethod: 'post_market_monitoring',
      detectedAt: e.occurredAt ?? new Date().toISOString(),
    })
    incidentId = incident.id ?? null
  }
  return upsertRow('post_market_events', {
    id: e.id,
    plan_id: e.planId || null,
    incident_id: incidentId,
    severity: e.severity,
    event_type: e.eventType,
    description: e.description,
    occurred_at: e.occurredAt,
    resolved: e.resolved,
  }, mapEvent)
}
export const deletePostMarketEvent = (id: string) => deleteRow('post_market_events', id)

// ---------------------------------------------------------------------------
// Policy templates — global READ-ONLY catalog (service-role writes only).
// ---------------------------------------------------------------------------
export interface PolicyTemplateBody {
  summary?: string
  sections?: { heading: string; text: string }[]
}

export interface PolicyTemplateRecord {
  id: string
  templateRef?: string
  name: string
  category?: string
  framework?: string
  clauseRefs: string[]
  description?: string
  body: PolicyTemplateBody
  version?: string
  isSystem: boolean
  createdAt?: string
}

const mapTemplate = (r: any): PolicyTemplateRecord => ({
  id: r.id,
  templateRef: r.template_ref ?? undefined,
  name: r.name ?? '',
  category: r.category ?? undefined,
  framework: r.framework ?? undefined,
  clauseRefs: r.clause_refs ?? [],
  description: r.description ?? undefined,
  body: (r.body && typeof r.body === 'object') ? r.body : {},
  version: r.version ?? undefined,
  isSystem: !!r.is_system,
  createdAt: r.created_at,
})

export async function fetchPolicyTemplates(): Promise<PolicyTemplateRecord[]> {
  const { data, error } = await client().from('policy_templates').select('*').order('name', { ascending: true })
  if (error) {
    console.warn('[regulatoryOpsService] fetch %s failed: %s', 'policy_templates', error.message)
    throw new Error(`Could not load policy templates: ${error.message}`)
  }
  return (data ?? []).map(mapTemplate)
}

// Instantiates a catalog template into a real, org-scoped draft policy plus
// its first policy_versions row. Both writes are checked and throw — the
// caller never sees success unless both persisted.
export async function instantiateTemplate(
  template: PolicyTemplateRecord,
  byName?: string,
): Promise<PolicyRecord> {
  const policyRef = `POL-${Date.now().toString(36).toUpperCase()}`
  const policy = await upsertPolicy({
    policyRef,
    name: template.name,
    title: template.name,
    description: template.description,
    category: template.category,
    framework: template.framework,
    status: 'draft',
    version: '1.0',
    content: template.body,
    linkedFrameworks: template.framework ? [template.framework] : [],
    tags: template.templateRef ? [`template:${template.templateRef}`] : [],
  })
  if (!policy.id) throw new Error('The policy row did not return an id — version not recorded')
  await savePolicyVersion(
    policy.id,
    '1.0',
    template.body,
    byName,
    `Instantiated from template ${template.templateRef ?? template.name}`,
  )
  return policy
}
