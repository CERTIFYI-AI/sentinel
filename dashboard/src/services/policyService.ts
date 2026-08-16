// SPDX-License-Identifier: Apache-2.0
// Policies on the platform contract (CLAUDE.md): the real org-scoped
// `policies` table only (the quarantined PascalCase `Policy` view is gone),
// camelCase↔snake_case mapping at this boundary, writes THROW on failure so
// the UI can never report a false success, and the client never sends the
// scoping columns (tenant_id/org_id — DB defaults fill them under RLS).
// Versioned editing persists to `policy_versions`.
import { supabase, isSupabaseConfigured } from '../lib/supabase'

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
  content: r.content ?? undefined,
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

// Backward-compatible aliases (existing hooks/pages import these names).
export const fetchPolicies = fetchAllPolicies
export const fetchAllPolicys = fetchAllPolicies
export const fetchPolicys = fetchAllPolicies
export const savePolicy = upsertPolicy
