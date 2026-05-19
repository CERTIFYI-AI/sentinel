// @ts-nocheck
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type VendorRecord = {
  id: string
  org_id?: string
  name: string
  category?: string
  risk_tier?: string
  status?: string
  contact_email?: string
  contract_expiry?: string
  last_assessment?: string
  description?: string
  metadata?: Record<string,any>
  created_at: string
  updated_at: string
}

export async function fetchAllVendors(filters: Record<string,any> = {}): Promise<VendorRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    // Try snake_case first, fallback to PascalCase Prisma table
    let q = supabase.from('Vendor').select('*').order('createdAt', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    const { data, error } = await q
    if (error) {
      // fallback to snake_case vendors table
      const { data: d2 } = await supabase.from('vendors').select('*').order('created_at', { ascending: false })
      return (d2 ?? []) as VendorRecord[]
    }
    return (data ?? []) as VendorRecord[]
  } catch { return [] }
}

export async function upsertVendor(record: Partial<VendorRecord>): Promise<VendorRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase.from('vendors').upsert(record).select().single()
    if (error) { console.warn('[vendorService] upsert:', error.message); return null }
    return data as VendorRecord
  } catch { return null }
}

export async function deleteVendor(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('vendors').delete().eq('id', id)
    if (error) { console.warn('[vendorService] delete:', error.message); return false }
    return true
  } catch { return false }
}

export const fetchVendors = fetchAllVendors
export const saveVendor = upsertVendor
