// SPDX-License-Identifier: Apache-2.0
// Policies on the platform contract (CLAUDE.md): the real org-scoped
// `policies` table only (the quarantined PascalCase `Policy` view is gone),
// camelCase↔snake_case mapping at this boundary, writes THROW on failure so
// the UI can never report a false success, and the client never sends the
// scoping columns (tenant_id/org_id — DB defaults fill them under RLS).
// Versioned editing persists to `policy_versions`; the approval lifecycle
// (submit → in_review → published/draft) runs through the oversight approvals
// queue, and readership evidence lives in `policy_acknowledgments`.
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { withAudit } from '../lib/withAudit'
import { governanceBus } from '../lib/governance/eventBus'

function client() {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — policy data is unavailable')
  }
  return supabase
}

export interface PolicyRecord {
  id?: string
  policyRef?: string
  name?: string
  title: string                // display name: name ?? title on read
  description?: string
  type?: string
  category?: string
  status: string               // draft | in_review | published | archived
  version?: string
  content?: any                // jsonb {summary, sections:[{heading, text|body}]}
  effectiveDate?: string | null
  effectiveAt?: string | null
  nextReviewAt?: string | null
  nextReviewDate?: string | null
  owner?: string | null
  approver?: string | null
  framework?: string | null
  linkedFrameworks?: string[]
  linkedControlIds?: string[]  // → controls.id
  acknowledgmentRequired?: boolean
  tags?: string[]
  metadata?: Record<string, unknown>
  isDeleted?: boolean
  createdAt?: string
  updatedAt?: string
}

// content is jsonb {summary, sections} — but rows written before the jsonb
// migration (or by external importers) may still carry a JSON string or bare
// prose. Normalise defensively so the UI always sees one shape.
function normalizeContent(raw: unknown): any {
  let c = raw
  if (typeof c === 'string') {
    try { c = JSON.parse(c) } catch { /* bare prose — wrap below */ }
  }
  if (c == null) return undefined
  if (typeof c === 'string') return { summary: c, sections: [] }
  if (typeof c === 'object' && !Array.isArray(c)) return c
  return { summary: '', sections: [] }
}

const mapPolicy = (r: any): PolicyRecord => ({
  id: r.id,
  policyRef: r.policy_ref ?? undefined,
  name: r.name ?? undefined,
  title: r.name ?? r.title ?? '',
  description: r.description ?? undefined,
  type: r.type ?? undefined,
  category: r.category ?? undefined,
  status: (r.status ?? 'draft').toLowerCase(),
  version: r.version ?? undefined,
  content: normalizeContent(r.content),
  effectiveDate: r.effective_date ?? null,
  effectiveAt: r.effective_at ?? null,
  nextReviewAt: r.next_review_at ?? null,
  nextReviewDate: r.next_review_date ?? null,
  owner: r.owner ?? null,
  approver: r.approver ?? null,
  framework: r.framework ?? null,
  linkedFrameworks: r.linked_frameworks ?? [],
  linkedControlIds: r.linked_control_ids ?? [],
  acknowledgmentRequired: r.acknowledgment_required ?? false,
  tags: r.tags ?? [],
  metadata: r.metadata ?? {},
  isDeleted: r.is_deleted ?? false,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

/** Next version label after `last`. Handles 'maj.min' (with optional 'v'
 *  prefix) AND legacy single-integer versions: '4' → '4.1' (not a regression
 *  to '1.0'). No recorded version at all → '1.0'. */
export function nextVersion(last?: string | null): string {
  const full = /^v?(\d+)\.(\d+)/.exec(last ?? '')
  const prefix = /^v/i.test(last ?? '') ? 'v' : ''
  if (full) return `${prefix}${full[1]}.${Number(full[2]) + 1}`
  const intOnly = /^v?(\d+)\s*$/.exec(last ?? '')
  if (intOnly) return `${prefix}${intOnly[1]}.1`
  return '1.0'
}

export async function fetchAllPolicies(): Promise<PolicyRecord[]> {
  const { data, error } = await client()
    .from('policies')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('[policyService] fetch failed: %s', error.message)
    throw new Error(`Could not load policies: ${error.message}`)
  }
  return (data ?? []).filter((r: any) => !r.is_deleted).map(mapPolicy)
}

// Upsert without an id lets the uuid DB default assign one.
export async function upsertPolicy(p: PolicyRecord): Promise<PolicyRecord> {
  const row: Record<string, unknown> = {
    id: p.id,
    policy_ref: p.policyRef,
    name: p.name ?? p.title,
    title: p.title ?? p.name,
    description: p.description,
    type: p.type,
    category: p.category,
    status: p.status?.toLowerCase(),
    version: p.version,
    content: p.content,
    effective_date: p.effectiveDate,
    effective_at: p.effectiveAt,
    next_review_at: p.nextReviewAt,
    next_review_date: p.nextReviewDate,
    owner: p.owner,
    approver: p.approver,
    framework: p.framework,
    linked_frameworks: p.linkedFrameworks,
    linked_control_ids: p.linkedControlIds,
    acknowledgment_required: p.acknowledgmentRequired,
    tags: p.tags,
    metadata: p.metadata,
    updated_at: new Date().toISOString(),
  }
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k])
  const { data, error } = await client().from('policies').upsert(row).select().single()
  if (error) {
    console.warn('[policyService] upsert failed: %s', error.message)
    throw new Error(`The policy did not persist: ${error.message}`)
  }
  return mapPolicy(data)
}

export async function deletePolicy(id: string): Promise<void> {
  const { error } = await client().from('policies').delete().eq('id', id)
  if (error) {
    console.warn('[policyService] delete failed: %s', error.message)
    throw new Error(`Delete failed: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// Policy versions (policy_versions.policy_id → policies.id; content is TEXT
// in the DB, so structured content is stored as its JSON serialisation).
// ---------------------------------------------------------------------------
export interface PolicyVersionRecord {
  id?: string
  policyId: string             // → policies.id
  version?: string
  content?: string | null      // raw text (JSON when the source was structured)
  status?: string
  changedBy?: string | null
  changelog?: string | null
  createdAt?: string
}

const mapVersion = (r: any): PolicyVersionRecord => ({
  id: r.id,
  policyId: r.policy_id,
  version: r.version ?? undefined,
  content: r.content ?? null,
  status: r.status ?? undefined,
  changedBy: r.changed_by ?? null,
  changelog: r.changelog ?? null,
  createdAt: r.created_at,
})

export async function fetchPolicyVersions(policyId: string): Promise<PolicyVersionRecord[]> {
  const { data, error } = await client()
    .from('policy_versions')
    .select('*')
    .eq('policy_id', policyId)
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('[policyService] versions fetch failed: %s', error.message)
    throw new Error(`Could not load policy versions: ${error.message}`)
  }
  return (data ?? []).map(mapVersion)
}

export async function savePolicyVersion(
  policyId: string,
  version: string,
  content: unknown,
  changedBy?: string,
  changelog?: string,
): Promise<PolicyVersionRecord> {
  const { data, error } = await client()
    .from('policy_versions')
    .insert({
      policy_id: policyId,
      version,
      content: typeof content === 'string' ? content : JSON.stringify(content ?? null),
      status: 'recorded',
      changed_by: changedBy ?? null,
      changelog: changelog ?? null,
    })
    .select()
    .single()
  if (error) {
    console.warn('[policyService] version write failed: %s', error.message)
    throw new Error(`The policy version did not persist: ${error.message}`)
  }
  return mapVersion(data)
}

// ---------------------------------------------------------------------------
// Approval lifecycle — submit routes through the oversight approvals queue
// (approval_workflows definition with applies_to='policy_change' provides the
// steps + SLA); publish/archive are the audited terminal transitions.
// ---------------------------------------------------------------------------

/** Submit a policy for approval: creates the pending approvals row (bound to
 *  the active 'policy_change' workflow when one exists) and moves the policy
 *  to in_review. Both writes are checked; a duplicate pending request for the
 *  same policy is refused instead of silently stacking. */
export async function submitPolicyForApproval(
  policy: PolicyRecord,
  requestedBy?: string | null,
): Promise<void> {
  if (!policy.id) throw new Error('Save the policy before submitting it for approval')
  const db = client()

  // Guard: one pending approval per policy — a second submission would create
  // two queue entries that can decide against each other.
  const { data: existing, error: existErr } = await db
    .from('approvals')
    .select('id, status')
    .eq('entity_type', 'policy')
    .eq('entity_id', policy.id)
    .eq('status', 'pending')
    .limit(1)
  if (existErr) throw new Error(`Could not check existing approvals: ${existErr.message}`)
  if ((existing ?? []).length > 0) {
    throw new Error('This policy already has a pending approval request — decide or delete it in Approval Workflows first.')
  }

  // Bind to the active policy_change workflow definition (steps + SLA), when
  // one exists. applies_to vocabulary: model_release | exception |
  // incident_report | policy_change.
  let workflowId: string | null = null
  let dueAt: string | null = null
  const { data: wf } = await db
    .from('approval_workflows')
    .select('id, steps')
    .eq('applies_to', 'policy_change')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (wf?.id) {
    workflowId = wf.id
    const sla = Array.isArray(wf.steps) ? wf.steps[0]?.sla_hours : undefined
    if (sla) dueAt = new Date(Date.now() + sla * 3600 * 1000).toISOString()
  }

  const orgId = await governanceBus.resolveOrgId(undefined)
  await withAudit(orgId, 'policy.submitted', 'policy', policy.id, async () => {
    const { error: apprErr } = await db.from('approvals').insert({
      entity_type: 'policy',
      entity_id: policy.id,
      entity_name: policy.title,
      workflow_id: workflowId,
      requested_by: requestedBy ?? null,
      requested_action: 'approve_policy',
      reason: `Publish request for policy ${policy.policyRef ?? policy.title}`,
      status: 'pending',
      step_index: 0,
      due_at: dueAt,
    })
    if (apprErr) throw new Error(`The approval request did not persist: ${apprErr.message}`)

    const { error: polErr } = await db
      .from('policies')
      .update({ status: 'in_review', updated_at: new Date().toISOString() })
      .eq('id', policy.id!)
    if (polErr) {
      throw new Error(`The approval request was created but the policy status did not update: ${polErr.message}`)
    }
  }, policy.title)
}

/** Direct publish transition (admin path outside the approval queue) —
 *  audited with the policy title. */
export async function publishPolicy(id: string, approver?: string | null): Promise<PolicyRecord> {
  const db = client()
  const { data: pre } = await db.from('policies').select('title, name').eq('id', id).maybeSingle()
  const orgId = await governanceBus.resolveOrgId(undefined)
  return withAudit(orgId, 'policy.published', 'policy', id, async () => {
    const now = new Date().toISOString()
    const { data, error } = await db
      .from('policies')
      .update({ status: 'published', approver: approver ?? null, approved_at: now, approval_date: now, updated_at: now })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`The policy was not published: ${error.message}`)
    return mapPolicy(data)
  }, pre?.name ?? pre?.title ?? undefined)
}

/** Archive (retire) a policy — audited with the policy title. */
export async function archivePolicy(id: string): Promise<PolicyRecord> {
  const db = client()
  const { data: pre } = await db.from('policies').select('title, name').eq('id', id).maybeSingle()
  const orgId = await governanceBus.resolveOrgId(undefined)
  return withAudit(orgId, 'policy.archived', 'policy', id, async () => {
    const { data, error } = await db
      .from('policies')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`The policy was not archived: ${error.message}`)
    return mapPolicy(data)
  }, pre?.name ?? pre?.title ?? undefined)
}

// ---------------------------------------------------------------------------
// Policy acknowledgments — readership/attestation evidence per person and
// policy version (`policy_acknowledgments`; source 'manual' or 'training',
// the latter synced from ai_trainings attendees by aiLiteracyService).
// ---------------------------------------------------------------------------
export interface PolicyAckRecord {
  id?: string
  policyId: string             // → policies.id
  policyVersion?: string | null
  personName: string
  personEmail?: string | null
  source: 'manual' | 'training'
  trainingId?: string | null   // → ai_trainings.id when source='training'
  status: 'pending' | 'acknowledged' | 'declined'
  acknowledgedAt?: string | null
  note?: string | null
  createdAt?: string
  updatedAt?: string
}

const mapAck = (r: any): PolicyAckRecord => ({
  id: r.id,
  policyId: r.policy_id,
  policyVersion: r.policy_version ?? null,
  personName: r.person_name ?? '',
  personEmail: r.person_email ?? null,
  source: (r.source ?? 'manual') as 'manual' | 'training',
  trainingId: r.training_id ?? null,
  status: (r.status ?? 'pending') as 'pending' | 'acknowledged' | 'declined',
  acknowledgedAt: r.acknowledged_at ?? null,
  note: r.note ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

export async function fetchPolicyAcks(policyId: string): Promise<PolicyAckRecord[]> {
  const { data, error } = await client()
    .from('policy_acknowledgments')
    .select('*')
    .eq('policy_id', policyId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Could not load acknowledgments: ${error.message}`)
  return (data ?? []).map(mapAck)
}

/** Request acknowledgments from a list of people — bulk-inserts pending rows
 *  for the given policy version. Throws on failure (partial writes surface). */
export async function requestPolicyAcks(
  policyId: string,
  version: string | null,
  people: { name: string; email?: string }[],
): Promise<PolicyAckRecord[]> {
  const rows = people
    .filter((p) => p.name.trim())
    .map((p) => ({
      policy_id: policyId,
      policy_version: version,
      person_name: p.name.trim(),
      person_email: p.email?.trim() || null,
      source: 'manual',
      status: 'pending',
    }))
  if (!rows.length) throw new Error('Add at least one person to request acknowledgment from')
  const { data, error } = await client().from('policy_acknowledgments').insert(rows).select()
  if (error) throw new Error(`The acknowledgment requests did not persist: ${error.message}`)
  return (data ?? []).map(mapAck)
}

/** Mark one acknowledgment row acknowledged — audited ('policy.acknowledged'
 *  with the person's name carried as entity metadata). */
export async function acknowledgePolicy(ackId: string, byName?: string): Promise<PolicyAckRecord> {
  const db = client()
  const { data: pre } = await db
    .from('policy_acknowledgments').select('person_name, policy_id').eq('id', ackId).maybeSingle()
  const orgId = await governanceBus.resolveOrgId(undefined)
  return withAudit(orgId, 'policy.acknowledged', 'policy_acknowledgment', ackId, async () => {
    const { data, error } = await db
      .from('policy_acknowledgments')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        note: byName ? `Acknowledged by ${byName}` : null,
      })
      .eq('id', ackId)
      .select()
      .single()
    if (error) throw new Error(`The acknowledgment did not persist: ${error.message}`)
    return mapAck(data)
  }, pre?.person_name ?? byName ?? undefined)
}

// ---------------------------------------------------------------------------
// Inbound interlinks — everything on the platform that points AT one policy.
// Each source is queried independently and tolerates failure (count null =
// unavailable) so one missing table never blanks the whole panel.
// ---------------------------------------------------------------------------
export interface PolicyBacklinkItem {
  id: string
  ref: string | null
  title: string
  status: string | null
}
export interface PolicyBacklinks {
  trainings: { count: number | null; items: PolicyBacklinkItem[] }
  aiApps: { count: number | null; items: PolicyBacklinkItem[] }
  documents: { count: number | null; items: PolicyBacklinkItem[] }
  controls: { count: number | null; items: PolicyBacklinkItem[] }
}

export async function fetchPolicyBacklinks(policyId: string): Promise<PolicyBacklinks> {
  const db = client()
  const safe = async (q: PromiseLike<{ data: any[] | null; error: { message: string } | null }>,
    map: (r: any) => PolicyBacklinkItem) => {
    try {
      const { data, error } = await q
      if (error) {
        console.warn('[policyService] backlink query failed: %s', error.message)
        return { count: null, items: [] }
      }
      return { count: (data ?? []).length, items: (data ?? []).map(map) }
    } catch (e) {
      console.warn('[policyService] backlink query failed: %s', e instanceof Error ? e.message : String(e))
      return { count: null, items: [] }
    }
  }
  const [trainings, aiApps, documents, controls] = await Promise.all([
    safe(
      db.from('ai_trainings').select('id, training_ref, name, status').eq('linked_policy_id', policyId).eq('is_deleted', false),
      (r) => ({ id: r.id, ref: r.training_ref ?? null, title: r.name ?? 'Unavailable', status: r.status ?? null }),
    ),
    safe(
      db.from('ai_apps').select('id, name, approval_status').eq('linked_policy_id', policyId).eq('is_deleted', false),
      (r) => ({ id: r.id, ref: null, title: r.name ?? 'Unavailable', status: r.approval_status ?? null }),
    ),
    safe(
      db.from('documents').select('id, title, status').eq('linked_entity_type', 'policy').eq('linked_entity_id', policyId),
      (r) => ({ id: r.id, ref: null, title: r.title ?? 'Unavailable', status: r.status ?? null }),
    ),
    safe(
      db.from('controls').select('id, control_ref, control_id, name, status').contains('linked_policy_ids', [policyId]),
      (r) => ({ id: r.id, ref: r.control_ref ?? r.control_id ?? null, title: r.name ?? 'Unavailable', status: r.status ?? null }),
    ),
  ])
  return { trainings, aiApps, documents, controls }
}

// Backward-compatible aliases (existing hooks/pages import these names).
export const fetchPolicies = fetchAllPolicies
export const savePolicy = upsertPolicy
