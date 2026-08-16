// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Third-party AI apps inventory (`ai_apps`) — governs the external AI tools
// staff actually use (shadow-AI discovery included): approval state, trust
// grade, allowed data classification, vendor link (vendors.id) and governing
// policy (policies.id). Org-scoped via RLS; writes throw.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

export type AppApprovalStatus = 'approved' | 'under_review' | 'restricted' | 'blocked'
export type AppCategory = 'assistant' | 'code' | 'content' | 'transcription' | 'analytics' | 'other'
export type AppTrustGrade = 'A' | 'B' | 'C' | 'D' | 'F'
export type AppAllowedData = 'public' | 'internal' | 'confidential' | 'restricted'
export type AppDiscovery = 'declared' | 'sso_audit' | 'network_scan' | 'expense_report'

export interface AiAppRecord {
  id: string
  name: string
  category: AppCategory
  vendorId?: string | null
  approvalStatus: AppApprovalStatus
  trustGrade?: AppTrustGrade | null
  allowedData: AppAllowedData
  businessUnits: string[]
  seats?: number | null
  discoveredVia: AppDiscovery
  ownerName?: string
  linkedPolicyId?: string | null
  notes?: string
  createdAt?: string
  updatedAt?: string
}

function fromRow(r: Record<string, any>): AiAppRecord {
  return {
    id: r.id,
    name: r.name ?? '',
    category: (r.category ?? 'other') as AppCategory,
    vendorId: r.vendor_id ?? null,
    approvalStatus: (r.approval_status ?? 'under_review') as AppApprovalStatus,
    trustGrade: (r.trust_grade ?? null) as AppTrustGrade | null,
    allowedData: (r.allowed_data ?? 'public') as AppAllowedData,
    businessUnits: Array.isArray(r.business_units) ? r.business_units : [],
    seats: r.seats ?? null,
    discoveredVia: (r.discovered_via ?? 'declared') as AppDiscovery,
    ownerName: r.owner_name ?? undefined,
    linkedPolicyId: r.linked_policy_id ?? null,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toRow(a: Partial<AiAppRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  if (a.name !== undefined) row.name = a.name
  if (a.category !== undefined) row.category = a.category
  if (a.vendorId !== undefined) row.vendor_id = a.vendorId || null
  if (a.approvalStatus !== undefined) row.approval_status = a.approvalStatus
  if (a.trustGrade !== undefined) row.trust_grade = a.trustGrade || null
  if (a.allowedData !== undefined) row.allowed_data = a.allowedData
  if (a.businessUnits !== undefined) row.business_units = a.businessUnits
  if (a.seats !== undefined) row.seats = a.seats ?? null
  if (a.discoveredVia !== undefined) row.discovered_via = a.discoveredVia
  if (a.ownerName !== undefined) row.owner_name = a.ownerName ?? null
  if (a.linkedPolicyId !== undefined) row.linked_policy_id = a.linkedPolicyId || null
  if (a.notes !== undefined) row.notes = a.notes ?? null
  return row
}

export async function fetchAiApps(): Promise<AiAppRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('ai_apps')
    .select('*')
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map(fromRow)
}

export async function createAiApp(a: Partial<AiAppRecord>): Promise<AiAppRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase.from('ai_apps').insert(toRow(a)).select().single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'ai-apps', entityType: 'ai_apps', entityId: data.id, action: 'create' })
  return fromRow(data)
}

export async function updateAiApp(id: string, patch: Partial<AiAppRecord>): Promise<AiAppRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase
    .from('ai_apps')
    .update({ ...toRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'ai-apps', entityType: 'ai_apps', entityId: id, action: 'update' })
  return fromRow(data)
}

export async function softDeleteAiApp(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
  const { error } = await supabase
    .from('ai_apps')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({ module: 'ai-apps', entityType: 'ai_apps', entityId: id, action: 'delete' })
}
