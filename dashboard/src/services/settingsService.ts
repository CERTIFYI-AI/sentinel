import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface TenantSettings {
  org?: {
    name: string; domain: string; industry: string;
    companySize: string; primaryContact: string;
    timezone: string; fiscalYearStart: string;
  };
  auth?: { mfa: boolean; sso: boolean; ssoProvider: string; sessionTimeout: string; ipWhitelist: string[] };
  apiKeys?: Array<{ id: string; name: string; key: string; scopes: string[]; created: string; lastUsed: string; status: string }>;
  notifications?: Array<{ id: string; label: string; email: boolean; inApp: boolean; slack: boolean }>;
  retention?: Array<{ id: string; category: string; period: string; autoArchive: boolean; autoDelete: boolean }>;
  integrations?: Array<{ id: string; name: string; type: string; status: string; lastSync: string; icon: string }>;
  appearance?: { theme: string; accentColor: string; density: string };
}

const TENANT_ID = 'TNT-001'

export async function fetchTenantSettings(): Promise<TenantSettings | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase
      .from('Tenant')
      .select('settings')
      .eq('id', TENANT_ID)
      .single()
    if (error) { console.warn('[settingsService] fetch failed:', error.message); return null }
    return (data?.settings as TenantSettings) ?? null
  } catch { return null }
}

export async function saveTenantSettings(patch: Partial<TenantSettings>): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    // Merge with existing settings
    const current = await fetchTenantSettings()
    const merged = { ...(current || {}), ...patch }
    const { error } = await supabase
      .from('Tenant')
      .update({ settings: merged, updatedAt: new Date().toISOString() })
      .eq('id', TENANT_ID)
    if (error) { console.warn('[settingsService] save failed:', error.message); return false }
    return true
  } catch { return false }
}

export async function logSettingsAudit(entry: {
  user: string; section: string; field: string; oldValue: string; newValue: string;
}): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  try {
    await supabase.from('AuditLog').insert({
      id: crypto.randomUUID(),
      tenantId: TENANT_ID,
      action: 'settings_change',
      entity: 'settings',
      entityId: TENANT_ID,
      userId: entry.user,
      metadata: { section: entry.section, field: entry.field, oldValue: entry.oldValue, newValue: entry.newValue },
      timestamp: new Date().toISOString(),
    })
  } catch { /* non-critical */ }
}
