import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const TENANT_ID = 'TNT-001'

export interface VendorRecord {
  id: string
  name: string
  status: string
  category: string
  contact_email: string | null
  risk_tier: number
  business_criticality: number
  regulatory_exposure: number
  is_deleted: boolean
  tenant_id: string
  created_at: string
  updated_at: string
}

export async function fetchVendors(): Promise<VendorRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    if (error) { console.warn('[vendorService] fetch failed:', error.message); return [] }
    return (data || []) as VendorRecord[]
  } catch { return [] }
}

export async function upsertVendor(vendor: Partial<VendorRecord>): Promise<VendorRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const record = { ...vendor, tenant_id: TENANT_ID, updated_at: new Date().toISOString() }
    if (!record.id) record.id = crypto.randomUUID()
    if (!record.created_at) record.created_at = new Date().toISOString()
    const { data, error } = await supabase.from('vendors').upsert(record).select().single()
    if (error) { console.warn('[vendorService] upsert failed:', error.message); return null }
    return data as VendorRecord
  } catch { return null }
}

export async function deleteVendor(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('vendors').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', TENANT_ID)
    if (error) { console.warn('[vendorService] delete failed:', error.message); return false }
    return true
  } catch { return false }
}
