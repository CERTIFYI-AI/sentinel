import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Real org-scoped `conformity_assessments` table. RLS scopes rows to the
// caller's org (tenant_id = current_user_org_id()::text) and the DB default
// fills tenant_id on insert. framework_id stores frameworks.id (uuid) and
// model_id stores ai_models.id (uuid); a few legacy rows still carry
// unresolvable slugs, which the UI renders as "Unavailable" rather than
// guessing a link. Writes throw on failure.

export type ConformityAssessmentRecord = {
  id: string
  tenant_id?: string
  assessment_id: string
  model_id?: string | null
  framework_id?: string | null
  title: string
  assessment_body?: string | null
  status?: string | null
  compliance_level?: string | null
  findings?: Record<string, unknown> | null
  evidence_ids?: string[] | null
  certificate_url?: string | null
  valid_until?: string | null
  assessor_id?: string | null
  created_at?: string
  updated_at?: string
}

export async function fetchConformityAssessments(): Promise<ConformityAssessmentRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('conformity_assessments')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.warn('[conformityService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []) as ConformityAssessmentRecord[]
}

export async function upsertConformityAssessment(
  record: Partial<ConformityAssessmentRecord>,
): Promise<ConformityAssessmentRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save assessment.')
  const { tenant_id: _omit, ...payload } = record
  const { data, error } = await supabase.from('conformity_assessments').upsert(payload).select().single()
  if (error) { console.warn('[conformityService] upsert:', error.message); throw new Error(error.message) }
  return data as ConformityAssessmentRecord
}

export async function deleteConformityAssessment(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete assessment.')
  const { error } = await supabase.from('conformity_assessments').delete().eq('id', id)
  if (error) { console.warn('[conformityService] delete:', error.message); throw new Error(error.message) }
}
