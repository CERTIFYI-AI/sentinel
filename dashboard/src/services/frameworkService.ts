import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Real org-scoped `frameworks` / `controls` tables (RLS on org_id;
// frameworks.org_id is filled by the DB default). Writes throw on failure.

export type FrameworkRecord = {
  id: string
  org_id?: string | null
  code?: string | null
  name: string
  version?: string | null
  type?: string | null
  category?: string | null
  jurisdiction?: string | null
  description?: string | null
  score?: number | null
  target_score?: number | null
  controls_total?: number | null
  controls_implemented?: number | null
  control_count?: number | null
  next_audit_at?: string | null
  owner_id?: string | null
  is_active?: boolean | null
  created_at?: string
  updated_at?: string
  /** Legacy aliases kept for older readers — the live table stores `score` and `controls_total`. */
  compliance_score?: number | null
  controls_count?: number | null
}

export type ControlRecord = {
  id: string
  org_id?: string
  control_ref: string | null
  name: string
  description?: string | null
  framework_id?: string | null
  clause_ref?: string | null
  category?: string | null
  status?: string | null
  score?: number | null
  severity?: string | null
  evidence_count?: number | null
  last_tested_at?: string | null
  next_test_at?: string | null
}

export async function fetchAllFrameworks(filters: Record<string, any> = {}): Promise<FrameworkRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('frameworks').select('*').order('name', { ascending: true })
  if (filters.is_active !== undefined) q = q.eq('is_active', filters.is_active)
  const { data, error } = await q
  if (error) { console.warn('[frameworkService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []) as FrameworkRecord[]
}

export async function fetchControlsForFramework(frameworkId: string): Promise<ControlRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('controls')
    .select('id, control_ref, name, description, framework_id, clause_ref, category, status, score, severity, evidence_count, last_tested_at, next_test_at')
    .eq('framework_id', frameworkId)
    .order('control_ref', { ascending: true })
  if (error) { console.warn('[frameworkService] controls fetch:', error.message); throw new Error(error.message) }
  return (data ?? []) as ControlRecord[]
}

// Writes throw on failure (config/RLS/CHECK/network) so callers surface a real
// error toast instead of a false success. Never swallow to null.
export async function upsertFramework(record: Partial<FrameworkRecord>): Promise<FrameworkRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save framework.')
  // Scoping column is owned by the DB default + RLS.
  const { org_id: _omit, ...payload } = record
  const { data, error } = await supabase.from('frameworks').upsert(payload).select().single()
  if (error) { console.warn('[frameworkService] upsert:', error.message); throw new Error(error.message) }
  return data as FrameworkRecord
}

export async function deleteFramework(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete framework.')
  const { error } = await supabase.from('frameworks').delete().eq('id', id)
  if (error) { console.warn('[frameworkService] delete:', error.message); throw new Error(error.message) }
}

export const fetchFrameworks = fetchAllFrameworks
