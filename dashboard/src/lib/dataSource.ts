import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const TENANT_ID = 'default'

export async function fromDB<T>(supaFn: () => any, fallback: T[]): Promise<T[]> {
  if (!isSupabaseConfigured()) return fallback
  try {
    const { data, error } = await supaFn()
    if (error) { console.warn('[fromDB]', error.message); return fallback }
    return (data as T[]) ?? fallback
  } catch { return fallback }
}

export async function mutateDB<T>(supaFn: () => any, fallbackFn: () => T): Promise<T> {
  if (!isSupabaseConfigured()) return fallbackFn()
  try {
    const { data, error } = await supaFn()
    if (error) { console.warn('[mutateDB]', error.message); return fallbackFn() }
    return data as T
  } catch { return fallbackFn() }
}

export function getTenantId() { return TENANT_ID }

export async function getOrgId() {
  if (!isSupabaseConfigured()) return TENANT_ID
  const { data } = await supabase.from('organizations').select('id').limit(1).single()
  return data?.id ?? TENANT_ID
}

export async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? 'system'
}
