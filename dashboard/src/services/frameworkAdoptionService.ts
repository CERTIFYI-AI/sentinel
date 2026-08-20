// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Framework adoption — the org's compliance scope (ISO/IEC 42001 4.3).
// `framework_adoptions` is the source of truth for which frameworks the org
// manages against; `frameworks.is_active` is a derived convenience flag this
// service keeps in sync. Adopting, pausing and retiring are governed acts:
// each write is audit-logged with a real actor. Writes throw on failure.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

function client() {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — framework adoption is unavailable')
  }
  return supabase
}

export interface FrameworkAdoption {
  id: string
  frameworkId: string
  status: 'adopted' | 'paused' | 'retired'
  adoptedAt: string
  adoptedBy: string | null
  scopeNote: string | null
  targetAuditDate: string | null
}

const mapAdoption = (r: any): FrameworkAdoption => ({
  id: r.id, frameworkId: r.framework_id, status: r.status,
  adoptedAt: r.adopted_at, adoptedBy: r.adopted_by ?? null,
  scopeNote: r.scope_note ?? null, targetAuditDate: r.target_audit_date ?? null,
})

export async function fetchAdoptions(): Promise<FrameworkAdoption[]> {
  const { data, error } = await client()
    .from('framework_adoptions').select('*').order('adopted_at', { ascending: true })
  if (error) throw new Error(`Adoptions failed to load: ${error.message}`)
  return (data ?? []).map(mapAdoption)
}

async function syncIsActive(frameworkId: string, active: boolean): Promise<void> {
  const { error } = await client().from('frameworks')
    .update({ is_active: active }).eq('id', frameworkId)
  if (error) throw new Error(`Framework active flag did not sync: ${error.message}`)
}

export async function adoptFramework(p: {
  frameworkId: string; adoptedBy?: string; scopeNote?: string; targetAuditDate?: string | null
}): Promise<FrameworkAdoption> {
  // Upsert on (org, framework): re-adopting a paused/retired framework
  // reactivates the same scope record rather than minting a second one.
  const { data, error } = await client()
    .from('framework_adoptions')
    .upsert(
      {
        framework_id: p.frameworkId, status: 'adopted',
        adopted_by: p.adoptedBy ?? null, scope_note: p.scopeNote ?? null,
        target_audit_date: p.targetAuditDate ?? null,
        adopted_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,framework_id' },
    )
    .select().single()
  if (error) throw new Error(`Adoption did not persist: ${error.message}`)
  await syncIsActive(p.frameworkId, true)
  void logAction({ module: 'compliance', entityType: 'framework', entityId: p.frameworkId, action: 'adopt_framework', newValues: { scopeNote: p.scopeNote ?? null } })
  return mapAdoption(data)
}

export async function setAdoptionStatus(p: {
  adoptionId: string; frameworkId: string; status: FrameworkAdoption['status']
}): Promise<void> {
  const { error } = await client()
    .from('framework_adoptions')
    .update({ status: p.status, updated_at: new Date().toISOString() })
    .eq('id', p.adoptionId)
  if (error) throw new Error(`Adoption status did not persist: ${error.message}`)
  await syncIsActive(p.frameworkId, p.status === 'adopted')
  void logAction({ module: 'compliance', entityType: 'framework', entityId: p.frameworkId, action: `framework_${p.status}` })
}
