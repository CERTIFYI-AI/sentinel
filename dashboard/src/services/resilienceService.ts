// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Business Impact Analysis (`bia_processes`) and Identity Governance
// (`identities`, `sod_rules`, `sod_violations`, `access_reviews`,
// `jit_elevation_requests`).
//
// Both pages read generic (id, doc jsonb) demo tables — `bia_table` and
// `iga_table` — while these real org-scoped tables sat beside them holding the
// same records. A doc-jsonb table cannot carry a foreign key or a constraint,
// so neither page could reach the rest of the platform: a BIA process could not
// be tied to the assets that support it, and an identity could not be tied to
// the segregation rule it violates.

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { logAction } from '@/lib/auditLogger'

// ── BIA ─────────────────────────────────────────────────────────────────────

export const BIA_CRITICALITIES = ['critical', 'high', 'medium', 'low'] as const

export interface BiaProcess {
  id: string
  /** Citable reference (BIA-NNN). */
  refCode?: string
  businessProcess: string
  department?: string
  criticality?: string
  /** Recovery time objective — how long the process can be down. */
  rtoHours?: number | null
  /** Recovery point objective — how much data loss is tolerable. */
  rpoHours?: number | null
  /** Maximum tolerable period of disruption. */
  mtpdHours?: number | null
  /** Assets this process runs on — resolves into the Asset Registry. */
  linkedAssetIds: string[]
  /** Models reached through those assets — resolves into ai_models. */
  linkedModelIds: string[]
  createdAt?: string
  updatedAt?: string
}

function biaFromRow(r: Record<string, any>): BiaProcess {
  return {
    id: r.id,
    refCode: r.ref_code ?? undefined,
    businessProcess: r.business_process ?? '',
    department: r.department ?? undefined,
    criticality: r.criticality ?? undefined,
    rtoHours: r.rto_hours ?? null,
    rpoHours: r.rpo_hours ?? null,
    mtpdHours: r.mtpd_hours ?? null,
    linkedAssetIds: Array.isArray(r.linked_asset_ids) ? r.linked_asset_ids : [],
    linkedModelIds: Array.isArray(r.linked_model_ids) ? r.linked_model_ids : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** tenant_id omitted — the DB default fills it. */
function biaToRow(b: Partial<BiaProcess>): Record<string, any> {
  const row: Record<string, any> = {}
  if (b.id !== undefined) row.id = b.id
  if (b.refCode !== undefined) row.ref_code = b.refCode || null
  if (b.businessProcess !== undefined) row.business_process = b.businessProcess
  if (b.department !== undefined) row.department = b.department || null
  if (b.criticality !== undefined) row.criticality = b.criticality || null
  if (b.rtoHours !== undefined) row.rto_hours = b.rtoHours ?? null
  if (b.rpoHours !== undefined) row.rpo_hours = b.rpoHours ?? null
  if (b.mtpdHours !== undefined) row.mtpd_hours = b.mtpdHours ?? null
  if (b.linkedAssetIds !== undefined) row.linked_asset_ids = b.linkedAssetIds
  if (b.linkedModelIds !== undefined) row.linked_model_ids = b.linkedModelIds
  return row
}

export async function fetchBiaProcesses(): Promise<BiaProcess[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase.from('bia_processes').select('*').order('ref_code')
  if (error) throw new Error(error.message)
  return (data ?? []).map(biaFromRow)
}

export async function upsertBiaProcess(record: Partial<BiaProcess>): Promise<BiaProcess> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const creating = !record.id
  const { data, error } = await supabase
    .from('bia_processes')
    .upsert({ ...biaToRow(record), updated_at: new Date().toISOString() })
    .select().single()
  if (error) throw new Error(error.message)
  void logAction({
    module: 'bia', entityType: 'bia_processes', entityId: String(data.id),
    entityName: data.ref_code ?? data.business_process,
    action: creating ? 'create' : 'update',
  })
  return biaFromRow(data)
}

export async function deleteBiaProcess(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
  const { error } = await supabase.from('bia_processes').delete().eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({ module: 'bia', entityType: 'bia_processes', entityId: id, action: 'delete' })
  return true
}

// ── Identity Governance ─────────────────────────────────────────────────────

// These vocabularies are enforced by CHECK constraints
// (20260823000005_admin_registers_and_demo_table_lockdown.sql) — an option
// offered here that the database rejects would be a fake-success trap.
export const IDENTITY_TYPES = ['human', 'service', 'agent'] as const
export const PRIVILEGE_LEVELS = ['admin', 'operator', 'viewer'] as const
export const REVIEW_STATUSES = ['current', 'due', 'overdue', 'revoked'] as const

export interface Identity {
  id: string
  displayName: string
  email?: string
  identityType?: string
  role?: string
  department?: string
  /** How many AI systems this identity can reach — the governance-relevant number. */
  aiSystemsAccess?: number | null
  /**
   * The models behind that number, derived from privilege level by the
   * database (admin -> all, operator -> production, viewer -> none), so the
   * count is reproducible and every id resolves to a registry record.
   */
  linkedModelIds: string[]
  privilegeLevel?: string
  reviewStatus?: string
  createdAt?: string
  updatedAt?: string
}

export interface SodRule {
  id: string
  name: string
  moduleA?: string
  actionA?: string
  moduleB?: string
  actionB?: string
  severity?: string
  isActive: boolean
}

export interface SodViolation {
  id: string
  userId?: string | null
  conflictingRoles: string[]
  riskLevel?: string
  status?: string
  detectedAt?: string | null
  mitigationNotes?: string
}

export interface AccessReview {
  id: string
  reviewName: string
  scope?: string
  status?: string
  dueDate?: string | null
  totalEntitlements?: number | null
  approved?: number | null
  revoked?: number | null
  flagged?: number | null
}

function identityFromRow(r: Record<string, any>): Identity {
  return {
    id: r.id,
    displayName: r.display_name ?? '',
    email: r.email ?? undefined,
    identityType: r.identity_type ?? undefined,
    role: r.role ?? undefined,
    department: r.department ?? undefined,
    aiSystemsAccess: r.ai_systems_access ?? null,
    linkedModelIds: Array.isArray(r.linked_model_ids) ? r.linked_model_ids : [],
    privilegeLevel: r.privilege_level ?? undefined,
    reviewStatus: r.review_status ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function identityToRow(i: Partial<Identity>): Record<string, any> {
  const row: Record<string, any> = {}
  if (i.id !== undefined) row.id = i.id
  if (i.displayName !== undefined) row.display_name = i.displayName
  if (i.email !== undefined) row.email = i.email || null
  if (i.identityType !== undefined) row.identity_type = i.identityType || null
  if (i.role !== undefined) row.role = i.role || null
  if (i.department !== undefined) row.department = i.department || null
  if (i.aiSystemsAccess !== undefined) row.ai_systems_access = i.aiSystemsAccess ?? null
  if (i.privilegeLevel !== undefined) row.privilege_level = i.privilegeLevel || null
  if (i.reviewStatus !== undefined) row.review_status = i.reviewStatus || null
  return row
}

export async function fetchIdentities(): Promise<Identity[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase.from('identities').select('*').order('display_name')
  if (error) throw new Error(error.message)
  return (data ?? []).map(identityFromRow)
}

export async function upsertIdentity(record: Partial<Identity>): Promise<Identity> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const creating = !record.id
  const { data, error } = await supabase
    .from('identities')
    .upsert({ ...identityToRow(record), updated_at: new Date().toISOString() })
    .select().single()
  if (error) throw new Error(error.message)
  void logAction({
    module: 'identity-governance', entityType: 'identities', entityId: String(data.id),
    entityName: data.display_name, action: creating ? 'create' : 'update',
  })
  return identityFromRow(data)
}

export async function deleteIdentity(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
  const { error } = await supabase.from('identities').delete().eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({ module: 'identity-governance', entityType: 'identities', entityId: id, action: 'delete' })
  return true
}

export async function fetchSodRules(): Promise<SodRule[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase.from('sod_rules').select('*').order('name')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r: any) => ({
    id: r.id, name: r.name ?? '', moduleA: r.module_a ?? undefined, actionA: r.action_a ?? undefined,
    moduleB: r.module_b ?? undefined, actionB: r.action_b ?? undefined,
    severity: r.severity ?? undefined, isActive: r.is_active !== false,
  }))
}

export async function fetchSodViolations(): Promise<SodViolation[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase.from('sod_violations').select('*').order('detected_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((v: any) => ({
    id: v.id, userId: v.user_id ?? null,
    conflictingRoles: Array.isArray(v.conflicting_roles) ? v.conflicting_roles : [],
    riskLevel: v.risk_level ?? undefined, status: v.status ?? undefined,
    detectedAt: v.detected_at ?? null, mitigationNotes: v.mitigation_notes ?? undefined,
  }))
}

export async function fetchAccessReviews(): Promise<AccessReview[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase.from('access_reviews').select('*').order('due_date')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r: any) => ({
    id: r.id, reviewName: r.review_name ?? '', scope: r.scope ?? undefined,
    status: r.status ?? undefined, dueDate: r.due_date ?? null,
    totalEntitlements: r.total_entitlements ?? null, approved: r.approved ?? null,
    revoked: r.revoked ?? null, flagged: r.flagged ?? null,
  }))
}
