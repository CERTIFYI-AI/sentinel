import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const TENANT_ID = 'TNT-001'

export interface FrameworkRecord {
  id: string
  name: string
  version: string
  status: string
  description: string
  tenantId: string
  createdAt: string
  updatedAt: string
}

export async function fetchFrameworks(): Promise<FrameworkRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('Framework')
      .select('*')
      .eq('tenantId', TENANT_ID)
      .order('name', { ascending: true })
    if (error) { console.warn('[frameworkService] fetch failed:', error.message); return [] }
    return (data || []) as FrameworkRecord[]
  } catch { return [] }
}
