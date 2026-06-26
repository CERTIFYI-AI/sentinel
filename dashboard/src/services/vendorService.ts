// vendorService.ts — Production Supabase service for the 'vendors' table.
// Maps Supabase column schema → UI VendorRecord shape used across all vendor pages.
//
// Supabase 'vendors' table columns (snake_case):
//   id, name, category, risk_tier, criticality, status, contact_email,
//   contract_expiry, last_assessment, description, dpa_status, score,
//   ai_use, services, metadata, org_id, created_at, updated_at

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

export type VendorRecord = {
  id: string
  org_id?: string
  name: string
  category: string
  // Risk fields
  risk: string            // UI alias for risk_tier (critical/high/medium/low)
  risk_tier?: string
  criticality?: string
  // Score
  score: number
  // Status
  status: string
  // DPA
  dpaStatus: string       // UI alias for dpa_status
  dpa_status?: string
  // Contact / contract
  contact_email?: string
  contract_expiry?: string
  last_assessment?: string
  lastReview?: string     // UI alias for last_assessment
  // Description / services
  description?: string
  services?: string
  // AI use classification
  ai_use?: string
  aiUse?: string          // UI alias for ai_use
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

// Maps Supabase DB row → UI VendorRecord shape
function mapRow(row: any): VendorRecord {
  const riskTier = row.risk_tier ?? row.criticality ?? 'low'
  return {
    id: row.id,
    org_id: row.org_id,
    name: row.name ?? '',
    category: row.category ?? '',
    // Risk
    risk: riskTier,
    risk_tier: riskTier,
    criticality: row.criticality ?? riskTier,
    // Score
    score: row.score ?? 0,
    // Status
    status: row.status ?? 'active',
    // DPA
    dpaStatus: row.dpa_status ?? 'not_signed',
    dpa_status: row.dpa_status ?? 'not_signed',
    // Contact / contract
    contact_email: row.contact_email,
    contract_expiry: row.contract_expiry,
    last_assessment: row.last_assessment,
    lastReview: row.last_assessment,
    // Description / services
    description: row.description,
    services: row.services,
    // AI use
    ai_use: row.ai_use,
    aiUse: row.ai_use,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// Maps UI VendorRecord → Supabase DB row for upsert
function mapToRow(record: Partial<VendorRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  if (record.id) row.id = record.id
  if (record.org_id) row.org_id = record.org_id
  if (record.name != null) row.name = record.name
  if (record.category != null) row.category = record.category
  if (record.risk != null) row.risk_tier = record.risk
  if (record.risk_tier != null) row.risk_tier = record.risk_tier
  if (record.criticality != null) row.criticality = record.criticality
  if (record.score != null) row.score = record.score
  if (record.status != null) row.status = record.status
  if (record.dpaStatus != null) row.dpa_status = record.dpaStatus
  if (record.dpa_status != null) row.dpa_status = record.dpa_status
  if (record.contact_email != null) row.contact_email = record.contact_email
  if (record.contract_expiry != null) row.contract_expiry = record.contract_expiry
  if (record.last_assessment != null) row.last_assessment = record.last_assessment
  if (record.lastReview != null) row.last_assessment = record.lastReview
  if (record.description != null) row.description = record.description
  if (record.services != null) row.services = record.services
  if (record.ai_use != null) row.ai_use = record.ai_use
  if (record.aiUse != null) row.ai_use = record.aiUse
  if (record.metadata != null) row.metadata = record.metadata
  row.updated_at = new Date().toISOString()
  return row
}

export async function fetchAllVendors(filters: Record<string, any> = {}): Promise<VendorRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    let q = supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.risk) q = q.eq('risk_tier', filters.risk)
    if (filters.category) q = q.eq('category', filters.category)
    const { data, error } = await q
    if (error) { console.warn('[vendorService] fetch:', error.message); return [] }
    return (data ?? []).map(mapRow)
  } catch (e) { console.warn('[vendorService] fetch exception:', e); return [] }
}

export async function upsertVendor(record: Partial<VendorRecord>): Promise<VendorRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const payload = mapToRow(record)
    const { data, error } = await supabase.from('vendors').upsert(payload).select().single()
    if (error) { console.warn('[vendorService] upsert:', error.message); return null }
    const result = mapRow(data)
    await logAction({ module: 'vendors', entityType: 'vendors', entityId: result.id, entityName: result.name, action: record.id ? 'update' : 'create', newValues: record })
    return result
  } catch { return null }
}

export async function deleteVendor(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('vendors').delete().eq('id', id)
    if (error) { console.warn('[vendorService] delete:', error.message); return false }
    await logAction({ module: 'vendors', entityType: 'vendors', entityId: id, action: 'delete' })
    return true
  } catch { return false }
}

export const fetchVendors = fetchAllVendors
export const saveVendor = upsertVendor
