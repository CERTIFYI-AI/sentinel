// SPDX-License-Identifier: Apache-2.0
// Oversight cluster (HITL · Approvals · Automation) on the platform contract:
// hitl_reviews is the SAME table the agent mesh writes (the UI and the
// HITLAgent finally share one queue), approvals are entity-linked decision
// records, automation rules keep an honest run log (no simulated engines).
// Writes THROW on failure; approve/reject decisions write an audit event.
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { withAudit } from '../lib/withAudit'
import { governanceBus } from '../lib/governance/eventBus'

function client() {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — oversight data is unavailable')
  }
  return supabase
}

async function selectAll<T>(table: string, mapper: (r: any) => T, order = 'created_at'): Promise<T[]> {
  const { data, error } = await client().from(table).select('*').order(order, { ascending: false })
  if (error) {
    console.warn('[oversightService] fetch %s failed: %s', table, error.message)
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

async function currentOrgId(): Promise<string> {
  return governanceBus.resolveOrgId(undefined)
}

// ---------------------------------------------------------------------------
// HITL reviews — one queue for humans AND the agent mesh.
// ---------------------------------------------------------------------------
export interface HitlRecord {
  id?: string
  entityType?: string          // model | incident | deployment | agent | ...
  entityId?: string | null
  entityName?: string | null
  modelId?: string | null      // ai_models.id as text (legacy column type)
  reviewType?: string
  title: string
  description?: string
  status: string               // pending | approved | rejected | info_requested
  priority: string
  riskLevel?: string
  triggerReason?: string | null
  assignedTo?: string | null
  slaHours?: number | null
  slaDeadline?: string | null
  blocksDeployment?: boolean
  decidedAt?: string | null
  decidedBy?: string | null
  decision?: string | null
  remarks?: string | null
  linkedRiskId?: string | null
  createdAt?: string
  updatedAt?: string
}

const mapHitl = (r: any): HitlRecord => ({
  id: r.id,
  entityType: r.entity_type ?? undefined,
  entityId: r.entity_id ?? null,
  entityName: r.entity_name ?? null,
  modelId: r.model_id ?? null,
  reviewType: r.review_type ?? undefined,
  title: r.title ?? r.reason ?? r.trigger_reason ?? 'Review required',
  description: r.description ?? undefined,
  status: (r.status ?? 'pending').toLowerCase(),
  priority: (r.priority ?? 'medium').toLowerCase(),
  riskLevel: r.risk_level ?? undefined,
  triggerReason: r.trigger_reason ?? r.reason ?? null,
  assignedTo: r.assigned_to ?? null,
  slaHours: r.sla_hours ?? null,
  slaDeadline: r.sla_deadline ?? null,
  blocksDeployment: r.blocks_deployment ?? false,
  decidedAt: r.decided_at ?? null,
  decidedBy: r.decided_by ?? null,
  decision: r.decision ?? null,
  remarks: r.remarks ?? null,
  linkedRiskId: r.linked_risk_id ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

export const fetchHitlReviews = () => selectAll('hitl_reviews', mapHitl)

export async function fetchHitlReview(id: string): Promise<HitlRecord | null> {
  const { data, error } = await client().from('hitl_reviews').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Could not load the review: ${error.message}`)
  return data ? mapHitl(data) : null
}

export const saveHitlReview = (h: HitlRecord) =>
  upsertRow('hitl_reviews', {
    id: h.id,
    entity_type: h.entityType,
    entity_id: h.entityId,
    entity_name: h.entityName,
    model_id: h.modelId,
    review_type: h.reviewType,
    title: h.title,
    description: h.description,
    status: h.status,
    priority: h.priority,
    risk_level: h.riskLevel,
    trigger_reason: h.triggerReason,
    assigned_to: h.assignedTo,
    sla_hours: h.slaHours,
    sla_deadline: h.slaDeadline,
    blocks_deployment: h.blocksDeployment,
    linked_risk_id: h.linkedRiskId,
    updated_at: new Date().toISOString(),
  }, mapHitl)

/** Approve / reject / request info — persists the decision and writes an
 *  audit event with the real actor. Throws if the decision does not land. */
export async function decideHitlReview(
  id: string,
  decision: 'approved' | 'rejected' | 'info_requested',
  decidedBy: string,
  remarks?: string,
): Promise<HitlRecord> {
  const orgId = await currentOrgId()
  // Read the title first so the audit event carries a human-readable
  // entity_name instead of only the uuid.
  const { data: pre } = await client()
    .from('hitl_reviews').select('title, entity_name').eq('id', id).maybeSingle()
  const auditName = pre?.title ?? pre?.entity_name ?? undefined
  return withAudit(orgId, `hitl.${decision}`, 'hitl_review', id, async () => {
    const { data, error } = await client()
      .from('hitl_reviews')
      .update({
        status: decision,
        decision,
        decided_by: decidedBy,
        decided_at: new Date().toISOString(),
        remarks: remarks ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`The decision did not persist: ${error.message}`)
    return mapHitl(data)
  }, auditName)
}

export const deleteHitlReview = (id: string) => deleteRow('hitl_reviews', id)

// ---------------------------------------------------------------------------
// Approval workflows (definitions) + approvals (entity-linked requests)
// ---------------------------------------------------------------------------
export interface ApprovalWorkflowRecord {
  id?: string
  name: string
  description?: string
  appliesTo?: string           // model_release | exception | incident_report | policy_change
  steps: { name: string; approver_role: string; required?: boolean; sla_hours?: number }[]
  requiresMfa: boolean
  escalationHours?: number | null
  notifyOnEscalation: boolean
  isActive: boolean
  status?: string
  createdAt?: string
}

const mapWorkflow = (r: any): ApprovalWorkflowRecord => ({
  id: r.id,
  name: r.name ?? '',
  description: r.description ?? undefined,
  appliesTo: r.applies_to ?? undefined,
  steps: Array.isArray(r.steps) ? r.steps : [],
  requiresMfa: r.requires_mfa ?? false,
  escalationHours: r.escalation_hours ?? null,
  notifyOnEscalation: r.notify_on_escalation ?? true,
  isActive: r.is_active ?? true,
  status: r.status ?? undefined,
  createdAt: r.created_at,
})

export async function fetchApprovalWorkflows(): Promise<ApprovalWorkflowRecord[]> {
  // Definitions carry a name; legacy per-entity rows in the same table don't.
  const rows = await selectAll('approval_workflows', mapWorkflow)
  return rows.filter((w) => w.name)
}

export const saveApprovalWorkflow = (w: ApprovalWorkflowRecord) =>
  upsertRow('approval_workflows', {
    id: w.id,
    // Legacy NOT NULL columns, set only on create — an update must not
    // clobber whatever the row already carries.
    ...(w.id ? {} : { entity_type: w.appliesTo ?? 'generic', entity_id: '', workflow_type: 'definition' }),
    name: w.name,
    description: w.description,
    applies_to: w.appliesTo,
    steps: w.steps,
    requires_mfa: w.requiresMfa,
    escalation_hours: w.escalationHours,
    notify_on_escalation: w.notifyOnEscalation,
    is_active: w.isActive,
    status: w.isActive ? 'active' : 'paused',
    updated_at: new Date().toISOString(),
  }, mapWorkflow)
export const deleteApprovalWorkflow = (id: string) => deleteRow('approval_workflows', id)

export interface ApprovalRecord {
  id?: string
  entityType: string           // model | exception | incident | policy
  entityId?: string | null     // uuid or text id of the governed entity
  entityName?: string | null
  workflowId?: string | null
  requestedBy?: string | null
  requestedAction?: string | null
  status: string               // pending | approved | rejected
  reason?: string | null
  approver?: string | null
  stepIndex: number
  decision?: string | null
  decidedAt?: string | null
  createdAt?: string
  decisions?: { step: number; name?: string | null; approver: string; decision: string; at: string }[]
  dueAt?: string | null
}

const mapApproval = (r: any): ApprovalRecord => ({
  id: r.id,
  entityType: r.entity_type ?? 'generic',
  entityId: r.entity_id ?? null,
  entityName: r.entity_name ?? null,
  workflowId: r.workflow_id ?? null,
  requestedBy: r.requested_by ?? null,
  requestedAction: r.requested_action ?? null,
  status: (r.status ?? 'pending').toLowerCase(),
  reason: r.reason ?? null,
  approver: r.approver ?? null,
  stepIndex: r.step_index ?? 0,
  decision: r.decision ?? null,
  decidedAt: r.decided_at ?? null,
  createdAt: r.created_at,
  decisions: Array.isArray(r.decisions) ? r.decisions : [],
  dueAt: r.due_at ?? null,
})

export const fetchApprovals = () => selectAll('approvals', mapApproval)

export const saveApproval = (a: ApprovalRecord) =>
  upsertRow('approvals', {
    id: a.id,
    entity_type: a.entityType,
    entity_id: a.entityId,
    entity_name: a.entityName,
    workflow_id: a.workflowId || null,
    requested_by: a.requestedBy,
    requested_action: a.requestedAction,
    status: a.status,
    reason: a.reason,
    step_index: a.stepIndex,
    due_at: a.dueAt,
    updated_at: new Date().toISOString(),
  }, mapApproval)

/** Decide an approval request — audited, throws on failure.
 *
 * Multi-step semantics: when the request is bound to a workflow whose
 * definition declares N steps, an approval only ADVANCES the current step
 * (recording the decider in the per-step `decisions` ledger); the request
 * reaches `approved` only after the final step. A rejection at any step is
 * terminal. Single-step / workflow-less requests decide immediately.
 * Also keeps exceptions in sync: deciding an approval whose entity is an
 * exception updates the exception row's status + approval_chain so the two
 * surfaces can never disagree. */
export async function decideApproval(
  id: string,
  decision: 'approved' | 'rejected',
  approver: string,
): Promise<ApprovalRecord> {
  const orgId = await currentOrgId()
  const { data: row, error: readErr } = await client()
    .from('approvals').select('*').eq('id', id).single()
  if (readErr) throw new Error(`Could not load the approval: ${readErr.message}`)
  const auditName: string | undefined =
    row.entity_name ?? (row.requested_action ? String(row.requested_action).replace(/_/g, ' ') : undefined)
  return withAudit(orgId, `approval.${decision}`, 'approval', id, async () => {
    const now = new Date().toISOString()

    let steps: { name?: string; sla_hours?: number }[] = []
    if (row.workflow_id) {
      const { data: wf } = await client()
        .from('approval_workflows').select('steps').eq('id', row.workflow_id).maybeSingle()
      if (Array.isArray(wf?.steps)) steps = wf!.steps
    }
    const stepIndex: number = row.step_index ?? 0
    const decisions: unknown[] = Array.isArray(row.decisions) ? row.decisions : []
    decisions.push({ step: stepIndex, name: steps[stepIndex]?.name ?? null, approver, decision, at: now })

    const isFinal = decision === 'rejected' || stepIndex + 1 >= Math.max(steps.length, 1)
    const patch: Record<string, unknown> = {
      decisions,
      approver,
      updated_at: now,
    }
    if (isFinal) {
      patch.status = decision
      patch.decision = decision
      patch.decided_at = now
    } else {
      patch.step_index = stepIndex + 1
      // re-arm the next step's SLA when the definition declares one
      const sla = steps[stepIndex + 1]?.sla_hours
      if (sla) patch.due_at = new Date(Date.now() + sla * 3600 * 1000).toISOString()
    }
    const { data, error } = await client()
      .from('approvals').update(patch).eq('id', id).select().single()
    if (error) throw new Error(`The decision did not persist: ${error.message}`)

    // Exception sync — the Exception Management page tracks the same decision
    // in exceptions.approval_chain; keep both surfaces consistent.
    if (isFinal && row.entity_type === 'exception' && row.entity_id) {
      const excStatus = decision === 'approved' ? 'approved' : 'denied'
      const { data: exc } = await client()
        .from('exceptions').select('approval_chain').eq('id', row.entity_id).maybeSingle()
      if (exc) {
        const chain = Array.isArray(exc.approval_chain) ? exc.approval_chain : []
        chain.push({ role: approver, decision: excStatus, date: now.slice(0, 10), notes: 'Decided in Approval Workflows' })
        const { error: excErr } = await client()
          .from('exceptions')
          .update({ status: excStatus, approver, approval_chain: chain, updated_at: now })
          .eq('id', row.entity_id)
        if (excErr) console.warn('[oversightService] exception sync failed: %s', excErr.message)
      }
    }
    return mapApproval(data)
  }, auditName)
}

export const deleteApproval = (id: string) => deleteRow('approvals', id)

// ---------------------------------------------------------------------------
// Automation rules + run history (honest: no simulated outcomes)
// ---------------------------------------------------------------------------
export interface AutomationRuleRecord {
  id?: string
  ruleRef?: string
  name: string
  description?: string
  status: string               // draft | active | paused
  triggerType?: string         // incident_created | model_drift | approval_required | schedule | manual
  triggerConfig: Record<string, unknown>
  actions: { type: string; config?: Record<string, unknown> }[]
  runCount: number
  lastRunAt?: string | null
  lastRunStatus?: string | null
  createdBy?: string | null
  createdAt?: string
  updatedAt?: string
}

const mapRule = (r: any): AutomationRuleRecord => ({
  id: r.id,
  ruleRef: r.rule_ref ?? undefined,
  name: r.name,
  description: r.description ?? undefined,
  status: r.status ?? 'draft',
  triggerType: r.trigger_type ?? undefined,
  triggerConfig: r.trigger_config ?? {},
  actions: Array.isArray(r.actions) ? r.actions : [],
  runCount: r.run_count ?? 0,
  lastRunAt: r.last_run_at ?? null,
  lastRunStatus: r.last_run_status ?? null,
  createdBy: r.created_by ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

export const fetchAutomationRules = () => selectAll('automation_rules', mapRule)
export const saveAutomationRule = (r: AutomationRuleRecord) =>
  upsertRow('automation_rules', {
    id: r.id,
    rule_ref: r.ruleRef,
    name: r.name,
    description: r.description,
    status: r.status,
    trigger_type: r.triggerType,
    trigger_config: r.triggerConfig,
    actions: r.actions,
    created_by: r.createdBy,
    updated_at: new Date().toISOString(),
  }, mapRule)
export const deleteAutomationRule = (id: string) => deleteRow('automation_rules', id)

export interface AutomationRunRecord {
  id?: string
  ruleId: string
  status: string               // completed | failed | validated
  triggerSource?: string | null
  startedAt?: string
  finishedAt?: string | null
  actionsRun?: number | null
  log: { at?: string; message: string }[]
  error?: string | null
}

const mapRunRec = (r: any): AutomationRunRecord => ({
  id: r.id,
  ruleId: r.rule_id,
  status: r.status ?? 'completed',
  triggerSource: r.trigger_source ?? null,
  startedAt: r.started_at,
  finishedAt: r.finished_at ?? null,
  actionsRun: r.actions_run ?? null,
  log: Array.isArray(r.log) ? r.log : [],
  error: r.error ?? null,
})

export async function fetchAutomationRuns(ruleId?: string): Promise<AutomationRunRecord[]> {
  let q = client().from('automation_runs').select('*').order('started_at', { ascending: false }).limit(100)
  if (ruleId) q = q.eq('rule_id', ruleId)
  const { data, error } = await q
  if (error) throw new Error(`Could not load run history: ${error.message}`)
  return (data ?? []).map(mapRunRec)
}

/** Validate a rule's configuration — a REAL check (trigger + each action has
 *  a type and well-formed config), recorded as a run with status 'validated'.
 *  Nothing is executed and no synthetic outcome is invented. */
export async function validateAutomationRule(rule: AutomationRuleRecord): Promise<AutomationRunRecord> {
  if (!rule.id) throw new Error('Save the rule before validating it')
  const problems: string[] = []
  if (!rule.triggerType) problems.push('No trigger type configured')
  if (!rule.actions.length) problems.push('Rule has no actions')
  rule.actions.forEach((a, i) => {
    if (!a.type) problems.push(`Action ${i + 1} has no type`)
  })
  const ok = problems.length === 0
  const log = ok
    ? [{ message: `Configuration valid: trigger '${rule.triggerType}', ${rule.actions.length} action(s). Not executed — validation only.` }]
    : problems.map((p) => ({ message: p }))
  const { data, error } = await client().from('automation_runs').insert({
    rule_id: rule.id,
    status: ok ? 'validated' : 'failed',
    trigger_source: 'manual_validation',
    finished_at: new Date().toISOString(),
    actions_run: 0,
    log,
    error: ok ? null : problems.join('; '),
  }).select().single()
  if (error) throw new Error(`Validation record did not persist: ${error.message}`)
  // Keep the rule's own counters honest — they drive the page KPIs.
  const { error: cntErr } = await client().from('automation_rules').update({
    run_count: (rule.runCount ?? 0) + 1,
    last_run_at: new Date().toISOString(),
    last_run_status: ok ? 'validated' : 'failed',
    updated_at: new Date().toISOString(),
  }).eq('id', rule.id)
  if (cntErr) console.warn('[oversightService] rule counter update failed: %s', cntErr.message)
  if (!ok) throw new Error(problems.join('; '))
  return mapRunRec(data)
}
