import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface OrgSettings {
  name: string
  domain: string
  industry: string
  company_size: string
  primary_contact: string
  timezone: string
  fiscal_year_start: string
}

export interface AuthSettings {
  mfa_required: boolean
  sso_enabled: boolean
  sso_provider: string
  session_timeout_minutes: number
  ip_whitelist: string[]
}

export interface ApiKeyRecord {
  id: string
  name: string
  key_prefix: string
  key_hash: string
  scopes: string[]
  status: string
  last_used_at: string | null
  created_at: string
}

export interface NotificationPref {
  id?: string
  channel: string
  event_type: string
  is_enabled: boolean
  config: Record<string, any>
}

export interface RetentionPolicy {
  id?: string
  category: string
  retention_period: string
  auto_archive: boolean
  auto_delete: boolean
}

export interface AppearanceSettings {
  theme: string
  accent_color: string
  density: string
  sidebar_collapsed: boolean
}

export interface AuditTrailSettings {
  retention_days: number
  log_read_events: boolean
  log_auth_events: boolean
  log_data_changes: boolean
  log_admin_actions: boolean
  export_enabled: boolean
  siem_integration?: string
  siem_endpoint?: string
}

// ── Organization ──────────────────────────────────────────────────────────────

export async function fetchOrgSettings(): Promise<OrgSettings | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('name, domain, industry, company_size, primary_contact, timezone, fiscal_year_start')
      .limit(1)
      .single()
    if (error) { console.warn('[settingsService] fetchOrgSettings:', error.message); return null }
    return data as OrgSettings
  } catch (e) { console.error('[settingsService] fetchOrgSettings:', e); return null }
}

export async function saveOrgSettings(patch: Partial<OrgSettings>): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    // Get the org id first
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    if (!org) return false
    const { error } = await supabase
      .from('organizations')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', org.id)
    if (error) { console.warn('[settingsService] saveOrgSettings:', error.message); return false }
    return true
  } catch (e) { console.error('[settingsService] saveOrgSettings:', e); return false }
}

// ── SSO / Auth ────────────────────────────────────────────────────────────────

export async function fetchSsoConfig(): Promise<AuthSettings | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase
      .from('sso_config')
      .select('*')
      .limit(1)
      .maybeSingle()
    if (error) { console.warn('[settingsService] fetchSsoConfig:', error.message); return null }
    if (!data) return null
    return {
      mfa_required: data.mfa_required ?? false,
      sso_enabled: data.is_active ?? false,
      sso_provider: data.provider ?? 'none',
      session_timeout_minutes: data.session_timeout_minutes ?? 480,
      ip_whitelist: data.ip_whitelist ?? [],
    }
  } catch (e) { return null }
}

export async function saveSsoConfig(patch: Partial<AuthSettings>): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const payload = {
      mfa_required: patch.mfa_required,
      is_active: patch.sso_enabled,
      provider: patch.sso_provider,
      session_timeout_minutes: patch.session_timeout_minutes,
      ip_whitelist: patch.ip_whitelist,
      updated_at: new Date().toISOString(),
    }
    // Upsert (org_id unique constraint)
    const { error } = await supabase
      .from('sso_config')
      .upsert(payload, { onConflict: 'org_id', ignoreDuplicates: false })
    if (error) { console.warn('[settingsService] saveSsoConfig:', error.message); return false }
    return true
  } catch (e) { console.error('[settingsService] saveSsoConfig:', e); return false }
}

// ── API Keys ──────────────────────────────────────────────────────────────────

export async function fetchApiKeys(): Promise<ApiKeyRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, scopes, status, last_used_at, created_at')
      .order('created_at', { ascending: false })
    if (error) { console.warn('[settingsService] fetchApiKeys:', error.message); return [] }
    return (data ?? []) as ApiKeyRecord[]
  } catch (e) { return [] }
}

export async function createApiKey(name: string, scopes: string[]): Promise<ApiKeyRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const prefix = `sk-${Math.random().toString(36).slice(2, 10)}`
    const hash = btoa(`${prefix}:${Date.now()}`) // Not real crypto — backend should hash
    const { data, error } = await supabase
      .from('api_keys')
      .insert({ name, key_prefix: prefix, key_hash: hash, scopes, status: 'Active' })
      .select()
      .single()
    if (error) { console.warn('[settingsService] createApiKey:', error.message); return null }
    return data as ApiKeyRecord
  } catch (e) { return null }
}

export async function revokeApiKey(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase
      .from('api_keys')
      .update({ status: 'Revoked' })
      .eq('id', id)
    if (error) { console.warn('[settingsService] revokeApiKey:', error.message); return false }
    return true
  } catch (e) { return false }
}

export async function deleteApiKey(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('api_keys').delete().eq('id', id)
    if (error) { console.warn('[settingsService] deleteApiKey:', error.message); return false }
    return true
  } catch (e) { return false }
}

// ── Notification Prefs ────────────────────────────────────────────────────────

export async function fetchNotificationPrefs(): Promise<NotificationPref[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('notification_prefs')
      .select('*')
      .order('event_type')
    if (error) { console.warn('[settingsService] fetchNotificationPrefs:', error.message); return [] }
    return (data ?? []) as NotificationPref[]
  } catch (e) { return [] }
}

export async function saveNotificationPrefs(prefs: NotificationPref[]): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    // Delete all existing prefs for this org and re-insert
    await supabase.from('notification_prefs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { error } = await supabase
      .from('notification_prefs')
      .insert(prefs.map(p => ({ channel: p.channel, event_type: p.event_type, is_enabled: p.is_enabled, config: p.config ?? {} })))
    if (error) { console.warn('[settingsService] saveNotificationPrefs:', error.message); return false }
    return true
  } catch (e) { return false }
}

// ── Data Retention ────────────────────────────────────────────────────────────

export async function fetchRetentionPolicies(): Promise<RetentionPolicy[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('data_retention_policies')
      .select('*')
      .order('category')
    if (error) { console.warn('[settingsService] fetchRetentionPolicies:', error.message); return [] }
    return (data ?? []) as RetentionPolicy[]
  } catch (e) { return [] }
}

export async function saveRetentionPolicies(policies: RetentionPolicy[]): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    for (const p of policies) {
      const { error } = await supabase
        .from('data_retention_policies')
        .upsert({
          category: p.category,
          retention_period: p.retention_period,
          auto_archive: p.auto_archive,
          auto_delete: p.auto_delete,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'org_id,category' })
      if (error) { console.warn('[settingsService] saveRetentionPolicies:', error.message) }
    }
    return true
  } catch (e) { return false }
}

// ── Appearance ────────────────────────────────────────────────────────────────

export async function fetchAppearanceConfig(): Promise<AppearanceSettings | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase
      .from('appearance_config')
      .select('*')
      .limit(1)
      .maybeSingle()
    if (error) { console.warn('[settingsService] fetchAppearanceConfig:', error.message); return null }
    return data as AppearanceSettings
  } catch (e) { return null }
}

export async function saveAppearanceConfig(patch: Partial<AppearanceSettings>): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase
      .from('appearance_config')
      .upsert({ ...patch, updated_at: new Date().toISOString() }, { onConflict: 'org_id' })
    if (error) { console.warn('[settingsService] saveAppearanceConfig:', error.message); return false }
    return true
  } catch (e) { return false }
}

// ── Audit Trail Config ────────────────────────────────────────────────────────

export async function fetchAuditTrailConfig(): Promise<AuditTrailSettings | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase
      .from('audit_trail_config')
      .select('*')
      .limit(1)
      .maybeSingle()
    if (error) { console.warn('[settingsService] fetchAuditTrailConfig:', error.message); return null }
    return data as AuditTrailSettings
  } catch (e) { return null }
}

export async function saveAuditTrailConfig(patch: Partial<AuditTrailSettings>): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase
      .from('audit_trail_config')
      .upsert({ ...patch, updated_at: new Date().toISOString() }, { onConflict: 'org_id' })
    if (error) { console.warn('[settingsService] saveAuditTrailConfig:', error.message); return false }
    return true
  } catch (e) { return false }
}

// ── Audit Log Entry ───────────────────────────────────────────────────────────

export async function logSettingsAudit(entry: {
  user: string; section: string; field: string; oldValue: string; newValue: string
}): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  try {
    await supabase.from('AuditLog').insert({
      id: crypto.randomUUID(),
      tenantId: 'default',
      action: 'settings_change',
      entity: 'settings',
      entityId: entry.section,
      userId: entry.user,
      metadata: { section: entry.section, field: entry.field, oldValue: entry.oldValue, newValue: entry.newValue },
      timestamp: new Date().toISOString(),
    })
  } catch { /* non-critical */ }
}

// Legacy shim used by useSettingsData hook
export type TenantSettings = {
  org?: Partial<OrgSettings>
  auth?: Partial<AuthSettings>
  apiKeys?: ApiKeyRecord[]
  notifications?: NotificationPref[]
  retention?: RetentionPolicy[]
  appearance?: Partial<AppearanceSettings>
  auditTrail?: Partial<AuditTrailSettings>
}

export async function fetchTenantSettings(): Promise<TenantSettings | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const [org, auth, apiKeys, notifications, retention, appearance, auditTrail] = await Promise.allSettled([
      fetchOrgSettings(),
      fetchSsoConfig(),
      fetchApiKeys(),
      fetchNotificationPrefs(),
      fetchRetentionPolicies(),
      fetchAppearanceConfig(),
      fetchAuditTrailConfig(),
    ])
    return {
      org: org.status === 'fulfilled' ? org.value ?? undefined : undefined,
      auth: auth.status === 'fulfilled' ? auth.value ?? undefined : undefined,
      apiKeys: apiKeys.status === 'fulfilled' ? apiKeys.value : [],
      notifications: notifications.status === 'fulfilled' ? notifications.value : [],
      retention: retention.status === 'fulfilled' ? retention.value : [],
      appearance: appearance.status === 'fulfilled' ? appearance.value ?? undefined : undefined,
      auditTrail: auditTrail.status === 'fulfilled' ? auditTrail.value ?? undefined : undefined,
    }
  } catch (e) { return null }
}

export async function saveTenantSettings(patch: Partial<TenantSettings>): Promise<boolean> {
  const results: boolean[] = []
  if (patch.org) results.push(await saveOrgSettings(patch.org as OrgSettings))
  if (patch.auth) results.push(await saveSsoConfig(patch.auth as AuthSettings))
  if (patch.notifications) results.push(await saveNotificationPrefs(patch.notifications as NotificationPref[]))
  if (patch.retention) results.push(await saveRetentionPolicies(patch.retention as RetentionPolicy[]))
  if (patch.appearance) results.push(await saveAppearanceConfig(patch.appearance as AppearanceSettings))
  if (patch.auditTrail) results.push(await saveAuditTrailConfig(patch.auditTrail as AuditTrailSettings))
  return results.every(Boolean)
}
