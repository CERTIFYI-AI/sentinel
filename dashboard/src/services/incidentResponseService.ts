// SPDX-License-Identifier: Apache-2.0
// Incident-response cluster on the platform contract (CLAUDE.md):
// real org-scoped tables (incidents, incident_workflow_steps,
// incident_playbooks, playbook_runs, tabletop_exercises, remediation_plans,
// exceptions), camelCase↔snake_case mapping at this boundary, writes THROW
// on failure so the UI can never report a false success, and the client
// never sends the scoping column (DB defaults fill it under RLS).
//
// Declaring an incident emits INCIDENT_CREATED on the governance bus — the
// mesh's 9-agent incident cascade fires from here.
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { governanceBus } from '../lib/governance/eventBus'

function client() {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — incident-response data is unavailable')
  }
  return supabase
}

async function selectAll<T>(table: string, mapper: (r: any) => T, order = 'created_at'): Promise<T[]> {
  const { data, error } = await client().from(table).select('*').order(order, { ascending: false })
  if (error) {
    console.warn('[incidentResponseService] fetch %s failed: %s', table, error.message)
    throw new Error(`Could not load ${table.replace(/_/g, ' ')}: ${error.message}`)
  }
  return (data ?? []).map(mapper)
}

async function upsertRow<T>(table: string, row: Record<string, unknown>, mapper: (r: any) => T): Promise<T> {
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k])
  const { data, error } = await client().from(table).upsert(row).select().single()
  if (error) throw new Error(`The write to ${table.replace(/_/g, ' ')} did not persist: ${error.message}`)
  return mapper(data)
}

async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await client().from(table).delete().eq('id', id)
  if (error) throw new Error(`Delete from ${table.replace(/_/g, ' ')} failed: ${error.message}`)
}

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------
export interface IncidentRecord {
  id?: string
  incidentId?: string          // business code INC-YYYY-NNN
  title: string
  description?: string
  severity: string             // critical | high | medium | low
  category?: string
  status: string               // open | investigating | containment | remediation | resolved | closed
  source?: string
  incidentType?: string
  modelId?: string | null      // → ai_models.id
  affectedModels?: string[]
  detectionMethod?: string
  detectedAt?: string | null
  occurredDate?: string | null
  slaHours?: number | null
  playbookId?: string | null   // → incident_playbooks.id
  assignee?: string | null
  responseTeam?: string[]
  regulatoryReportable?: boolean
  rootCause?: string | null
  impactDescription?: string | null
  financialImpact?: number | null
  linkedRiskIds?: string[]
  createdAt?: string
  updatedAt?: string
}

const mapIncident = (r: any): IncidentRecord => ({
  id: r.id,
  incidentId: r.incident_id ?? undefined,
  title: r.title,
  description: r.description ?? undefined,
  severity: (r.severity ?? 'medium').toLowerCase(),
  category: r.category ?? undefined,
  status: (r.status ?? 'open').toLowerCase(),
  source: r.source ?? undefined,
  incidentType: r.incident_type ?? undefined,
  modelId: r.model_id ?? null,
  affectedModels: r.affected_models ?? [],
  detectionMethod: r.detection_method ?? undefined,
  detectedAt: r.detected_at ?? null,
  occurredDate: r.occurred_date ?? null,
  slaHours: r.sla_hours ?? null,
  playbookId: r.playbook_id ?? null,
  assignee: r.assignee ?? null,
  responseTeam: r.response_team ?? [],
  regulatoryReportable: r.regulatory_reportable ?? false,
  rootCause: r.root_cause ?? null,
  impactDescription: r.impact_description ?? null,
  financialImpact: r.financial_impact ?? null,
  linkedRiskIds: r.linked_risk_ids ?? [],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const incidentToRow = (i: IncidentRecord): Record<string, unknown> => ({
  id: i.id,
  incident_id: i.incidentId,
  title: i.title,
  description: i.description,
  severity: i.severity?.toLowerCase(),
  category: i.category,
  status: i.status?.toLowerCase(),
  source: i.source,
  incident_type: i.incidentType,
  model_id: i.modelId || null,
  affected_models: i.affectedModels,
  detection_method: i.detectionMethod,
  detected_at: i.detectedAt,
  occurred_date: i.occurredDate,
  sla_hours: i.slaHours,
  playbook_id: i.playbookId || null,
  assignee: i.assignee,
  response_team: i.responseTeam,
  regulatory_reportable: i.regulatoryReportable,
  root_cause: i.rootCause,
  impact_description: i.impactDescription,
  financial_impact: i.financialImpact,
  linked_risk_ids: i.linkedRiskIds,
  updated_at: new Date().toISOString(),
})

export const fetchIncidents = () => selectAll('incidents', mapIncident)

export async function saveIncident(i: IncidentRecord): Promise<IncidentRecord> {
  const isNew = !i.id
  const saved = await upsertRow('incidents', incidentToRow(i), mapIncident)
  if (isNew) {
    // Fire the mesh cascade — this was the platform's biggest dead wire:
    // 9 agents register on INCIDENT_CREATED and no emitter existed.
    void governanceBus.emit('INCIDENT_CREATED', 'incident-log', {
      incident_id: saved.id,
      incident_ref: saved.incidentId,
      title: saved.title,
      severity: saved.severity,
      model_id: saved.modelId ?? undefined,
      regulatory_reportable: saved.regulatoryReportable,
    })
  }
  return saved
}

export const deleteIncident = (id: string) => deleteRow('incidents', id)

// Workflow transitions persist as steps AND update the incident row.
export interface WorkflowStepRecord {
  id?: string
  incidentId: string
  fromStatus?: string | null
  toStatus: string
  actor?: string | null
  notes?: string | null
  occurredAt?: string
}

const mapStep = (r: any): WorkflowStepRecord => ({
  id: r.id,
  incidentId: r.incident_id,
  fromStatus: r.from_status ?? null,
  toStatus: r.to_status,
  actor: r.actor ?? null,
  notes: r.notes ?? null,
  occurredAt: r.occurred_at,
})

export async function fetchWorkflowSteps(incidentId?: string): Promise<WorkflowStepRecord[]> {
  let q = client().from('incident_workflow_steps').select('*').order('occurred_at', { ascending: true })
  if (incidentId) q = q.eq('incident_id', incidentId)
  const { data, error } = await q
  if (error) throw new Error(`Could not load workflow history: ${error.message}`)
  return (data ?? []).map(mapStep)
}

export async function transitionIncident(
  incident: IncidentRecord,
  toStatus: string,
  actor?: string,
  notes?: string,
): Promise<IncidentRecord> {
  if (!incident.id) throw new Error('Cannot transition an unsaved incident')
  const { data, error } = await client()
    .from('incidents')
    .update({ status: toStatus.toLowerCase(), updated_at: new Date().toISOString() })
    .eq('id', incident.id)
    .select()
    .single()
  if (error) throw new Error(`The status change did not persist: ${error.message}`)
  const { error: stepErr } = await client().from('incident_workflow_steps').insert({
    incident_id: incident.id,
    from_status: incident.status,
    to_status: toStatus.toLowerCase(),
    actor: actor ?? null,
    notes: notes ?? null,
  })
  if (stepErr) console.warn('[incidentResponseService] step log failed: %s', stepErr.message)
  return mapIncident(data)
}

// ---------------------------------------------------------------------------
// Playbooks + activations
// ---------------------------------------------------------------------------
export interface PlaybookPhase { name: string; sla_minutes?: number; steps: { text: string; role?: string }[] }
export interface PlaybookRecord {
  id?: string
  playbookRef?: string
  name: string
  category?: string
  description?: string
  phases: PlaybookPhase[]
  escalationChain: { tier: number; role: string; contact_channel?: string }[]
  regulatoryTemplates: { authority: string; regulation?: string; deadline_hours?: number }[]
  status: string               // active | draft | archived
  version?: string
  lastTestedDate?: string | null
  owner?: string
  linkedModelIds?: string[]
  createdAt?: string
  updatedAt?: string
}

const mapPlaybook = (r: any): PlaybookRecord => ({
  id: r.id,
  playbookRef: r.playbook_ref ?? undefined,
  name: r.name,
  category: r.category ?? undefined,
  description: r.description ?? undefined,
  phases: r.phases ?? [],
  escalationChain: r.escalation_chain ?? [],
  regulatoryTemplates: r.regulatory_templates ?? [],
  status: r.status ?? 'active',
  version: r.version ?? undefined,
  lastTestedDate: r.last_tested_date ?? null,
  owner: r.owner ?? undefined,
  linkedModelIds: r.linked_model_ids ?? [],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

export const fetchPlaybooks = () => selectAll('incident_playbooks', mapPlaybook)
export const savePlaybook = (p: PlaybookRecord) =>
  upsertRow('incident_playbooks', {
    id: p.id,
    playbook_ref: p.playbookRef,
    name: p.name,
    category: p.category,
    description: p.description,
    phases: p.phases,
    escalation_chain: p.escalationChain,
    regulatory_templates: p.regulatoryTemplates,
    status: p.status,
    version: p.version,
    last_tested_date: p.lastTestedDate,
    owner: p.owner,
    linked_model_ids: p.linkedModelIds,
    updated_at: new Date().toISOString(),
  }, mapPlaybook)
export const deletePlaybook = (id: string) => deleteRow('incident_playbooks', id)

export interface PlaybookRunRecord {
  id?: string
  playbookId: string
  incidentId?: string | null
  status: string               // active | completed | aborted
  currentPhase?: string | null
  commander?: string | null
  severity?: string | null
  completedSteps: string[]     // "<phase>:<step index>"
  startedAt?: string
  completedAt?: string | null
  notes?: string | null
}

const mapRun = (r: any): PlaybookRunRecord => ({
  id: r.id,
  playbookId: r.playbook_id,
  incidentId: r.incident_id ?? null,
  status: r.status ?? 'active',
  currentPhase: r.current_phase ?? null,
  commander: r.commander ?? null,
  severity: r.severity ?? null,
  completedSteps: Array.isArray(r.completed_steps) ? r.completed_steps : [],
  startedAt: r.started_at,
  completedAt: r.completed_at ?? null,
  notes: r.notes ?? null,
})

export const fetchPlaybookRuns = () => selectAll('playbook_runs', mapRun, 'started_at')
export const savePlaybookRun = (r: PlaybookRunRecord) =>
  upsertRow('playbook_runs', {
    id: r.id,
    playbook_id: r.playbookId,
    incident_id: r.incidentId || null,
    status: r.status,
    current_phase: r.currentPhase,
    commander: r.commander,
    severity: r.severity,
    completed_steps: r.completedSteps,
    completed_at: r.completedAt,
    notes: r.notes,
  }, mapRun)

// ---------------------------------------------------------------------------
// Tabletop exercises (DB CHECK: type IR|BCP|DR|Ransomware|AI-Incident|
// Regulatory|Custom; status planned|in_progress|completed|cancelled)
// ---------------------------------------------------------------------------
export interface TabletopRecord {
  id?: string
  exerciseRef?: string
  name: string
  type: string
  scenario?: string
  status: string
  facilitator?: string | null
  participantNames: string[]
  scheduledAt?: string | null
  completedAt?: string | null
  durationMinutes?: number | null
  objectives: string[]
  readinessScore?: number | null
  findings: { finding: string; severity?: string }[]
  actionItems: { item: string; owner?: string; due?: string }[]
  lessonsLearned?: string | null
  linkedPlaybookId?: string | null
  createdAt?: string
}

const mapTabletop = (r: any): TabletopRecord => ({
  id: r.id,
  exerciseRef: r.exercise_ref ?? undefined,
  name: r.name,
  type: r.type ?? 'Custom',
  scenario: r.scenario ?? undefined,
  status: r.status ?? 'planned',
  facilitator: r.facilitator ?? null,
  participantNames: r.participant_names ?? [],
  scheduledAt: r.scheduled_at ?? null,
  completedAt: r.completed_at ?? null,
  durationMinutes: r.duration_minutes ?? null,
  objectives: r.objectives ?? [],
  readinessScore: r.readiness_score ?? null,
  findings: Array.isArray(r.findings) ? r.findings : [],
  actionItems: Array.isArray(r.action_items) ? r.action_items : [],
  lessonsLearned: r.lessons_learned ?? null,
  linkedPlaybookId: r.linked_playbook_id ?? null,
  createdAt: r.created_at,
})

export const fetchTabletops = () => selectAll('tabletop_exercises', mapTabletop)
export const saveTabletop = (t: TabletopRecord) =>
  upsertRow('tabletop_exercises', {
    id: t.id,
    exercise_ref: t.exerciseRef,
    name: t.name,
    type: t.type,
    scenario: t.scenario,
    status: t.status,
    facilitator: t.facilitator,
    participant_names: t.participantNames,
    scheduled_at: t.scheduledAt,
    completed_at: t.completedAt,
    duration_minutes: t.durationMinutes,
    objectives: t.objectives,
    readiness_score: t.readinessScore,
    findings: t.findings,
    action_items: t.actionItems,
    lessons_learned: t.lessonsLearned,
    linked_playbook_id: t.linkedPlaybookId || null,
    updated_at: new Date().toISOString(),
  }, mapTabletop)
export const deleteTabletop = (id: string) => deleteRow('tabletop_exercises', id)

// ---------------------------------------------------------------------------
// Remediation plans
// ---------------------------------------------------------------------------
export interface RemediationRecord {
  id?: string
  planRef?: string
  title: string
  description?: string
  status: string               // planned | in_progress | completed | blocked
  priority?: string
  owner?: string | null
  assignee?: string | null
  incidentId?: string | null   // → incidents.id
  riskId?: string | null       // → risks.id
  sourceType?: string | null
  sourceId?: string | null
  startDate?: string | null
  dueDate?: string | null
  progressPct: number
  linkedModelIds?: string[]
  milestones: { name: string; done: boolean }[]
  createdAt?: string
  updatedAt?: string
}

const mapRemediation = (r: any): RemediationRecord => ({
  id: r.id,
  planRef: r.plan_ref ?? undefined,
  title: r.title ?? '',
  description: r.description ?? undefined,
  status: (r.status ?? 'planned').toLowerCase(),
  priority: r.priority ?? undefined,
  owner: r.owner ?? null,
  assignee: r.assignee ?? null,
  incidentId: r.incident_id ?? null,
  riskId: r.risk_id ?? null,
  sourceType: r.source_type ?? null,
  sourceId: r.source_id ?? null,
  startDate: r.start_date ?? null,
  dueDate: r.due_date ?? null,
  progressPct: Number(r.progress_pct ?? 0),
  linkedModelIds: r.linked_model_ids ?? [],
  milestones: Array.isArray(r.milestones) ? r.milestones : [],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

export const fetchRemediations = () => selectAll('remediation_plans', mapRemediation)
export const saveRemediation = (r: RemediationRecord) =>
  upsertRow('remediation_plans', {
    id: r.id,
    plan_ref: r.planRef,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    owner: r.owner,
    assignee: r.assignee,
    incident_id: r.incidentId || null,
    risk_id: r.riskId || null,
    source_type: r.sourceType,
    source_id: r.sourceId,
    start_date: r.startDate,
    due_date: r.dueDate,
    progress_pct: r.progressPct,
    linked_model_ids: r.linkedModelIds,
    milestones: r.milestones,
    updated_at: new Date().toISOString(),
  }, mapRemediation)
export const deleteRemediation = (id: string) => deleteRow('remediation_plans', id)

// ---------------------------------------------------------------------------
// Exceptions (text PK — callers must provide a stable id on create)
// ---------------------------------------------------------------------------
export interface ExceptionRecord {
  id?: string
  exceptionId?: string
  title: string
  description?: string
  status: string               // pending | approved | denied | expired | under_review
  type?: string
  severity?: string
  owner?: string | null
  requestedBy?: string | null
  requestedDate?: string | null
  approver?: string | null
  riskAccepted?: string | null
  justification?: string | null
  expiryDate?: string | null
  reviewDate?: string | null
  renewalCount: number
  policyRef?: string | null
  likelihood?: number | null
  impact?: number | null
  riskScore?: number | null
  compensatingControls?: string | null
  impactScope?: string | null
  frameworkMapping: string[]
  regulatoryRef?: string | null
  department?: string | null
  affectedSystems: string[]
  tags: string[]
  approvalChain: { role: string; decision: string | null; date?: string | null; notes?: string | null }[]
  renewalHistory: { date: string; by?: string; notes?: string }[]
  linkedRiskId?: string | null
  linkedModelIds?: string[]
  createdAt?: string
  updatedAt?: string
}

const mapException = (r: any): ExceptionRecord => ({
  id: r.id,
  exceptionId: r.exception_id ?? undefined,
  title: r.title ?? '',
  description: r.description ?? undefined,
  status: (r.status ?? 'pending').toLowerCase().replace(' ', '_'),
  type: r.type ?? undefined,
  severity: r.severity ?? undefined,
  owner: r.owner ?? null,
  requestedBy: r.requested_by ?? null,
  requestedDate: r.requested_date ?? null,
  approver: r.approver ?? null,
  riskAccepted: r.risk_accepted ?? null,
  justification: r.justification ?? null,
  expiryDate: r.expiry_date ?? null,
  reviewDate: r.review_date ?? null,
  renewalCount: Number(r.renewal_count ?? 0),
  policyRef: r.policy_ref ?? null,
  likelihood: r.likelihood ?? null,
  impact: r.impact ?? null,
  riskScore: r.risk_score ?? null,
  compensatingControls: r.compensating_controls ?? null,
  impactScope: r.impact_scope ?? null,
  frameworkMapping: r.framework_mapping ?? [],
  regulatoryRef: r.regulatory_ref ?? null,
  department: r.department ?? null,
  affectedSystems: r.affected_systems ?? [],
  tags: r.tags ?? [],
  approvalChain: Array.isArray(r.approval_chain) ? r.approval_chain : [],
  renewalHistory: Array.isArray(r.renewal_history) ? r.renewal_history : [],
  linkedRiskId: r.linked_risk_id ?? null,
  linkedModelIds: r.linked_model_ids ?? [],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

export const fetchExceptions = () => selectAll('exceptions', mapException)
export const saveException = (e: ExceptionRecord) => {
  const id = e.id ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `exc-${crypto.randomUUID()}`
    : `exc-${Date.now()}-${Math.floor(Math.random() * 1e6)}`)
  return upsertRow('exceptions', {
    id,
    exception_id: e.exceptionId,
    title: e.title,
    description: e.description,
    status: e.status,
    type: e.type,
    severity: e.severity,
    owner: e.owner,
    requested_by: e.requestedBy,
    requested_date: e.requestedDate,
    approver: e.approver,
    risk_accepted: e.riskAccepted,
    justification: e.justification,
    expiry_date: e.expiryDate,
    review_date: e.reviewDate,
    renewal_count: e.renewalCount,
    policy_ref: e.policyRef,
    likelihood: e.likelihood,
    impact: e.impact,
    risk_score: e.riskScore,
    compensating_controls: e.compensatingControls,
    impact_scope: e.impactScope,
    framework_mapping: e.frameworkMapping,
    regulatory_ref: e.regulatoryRef,
    department: e.department,
    affected_systems: e.affectedSystems,
    tags: e.tags,
    approval_chain: e.approvalChain,
    renewal_history: e.renewalHistory,
    linked_risk_id: e.linkedRiskId || null,
    linked_model_ids: e.linkedModelIds,
    updated_at: new Date().toISOString(),
  }, mapException)
}
export const deleteException = (id: string) => deleteRow('exceptions', id)
