import { supabase, isSupabaseConfigured } from '../lib/supabase'

const TENANT_ID = 'default'

export async function fetchAllVendors(): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false })
    if (error) { console.warn('[vendorService] fetch failed:', error.message); return [] }
    return data ?? []
  } catch (e) { return [] }
}

export async function upsertVendor(record: Record<string, unknown>): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) return record
  try {
    const { data, error } = await supabase
      .from('vendors')
      .upsert({ ...record, tenant_id: TENANT_ID })
      .select()
      .single()
    if (error) { console.warn('[vendorService] upsert failed:', error.message); return record }
    return data
  } catch (e) { return record }
}

export async function deleteVendor(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id)
      .eq('tenant_id', TENANT_ID)
    if (error) { console.warn('[vendorService] delete failed:', error.message); return false }
    return true
  } catch (e) { return false }
}

// Backward-compatible aliases
export const fetchVendors = fetchAllVendors
export const saveVendor = upsertVendor

export type VendorRecord = Record<string, unknown>
