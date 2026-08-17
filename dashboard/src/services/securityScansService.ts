// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// securityScansService — the real `security_scans` table.
//
// V8 re-audit: this service previously returned SEED_SECURITY_SCANS
// (fabricated records keyed MDL-00x) whenever the table was empty OR the
// query failed — invented scan results presented as real security posture.
// Now: an empty table is an empty array, and a failed query THROWS so the
// caller can render a real error state. Writes throw too — no fake success
// (CLAUDE.md, First principle #4).

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { getTenantId } from '@/lib/dataSource'

const TENANT_ID = getTenantId()

export async function fetchAllSecurityScans(filters: Record<string, any> = {}) {
  if (!isSupabaseConfigured()) return []
  let q = supabase.from('security_scans').select('*, run_by:user_profiles(id,full_name)').order('created_at', { ascending: false })
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.type) q = q.eq('type', filters.type)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchSecurityScansById(id: string) {
  if (!isSupabaseConfigured() || !id) return null
  const { data, error } = await supabase.from('security_scans').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ?? null
}

export async function upsertSecurityScans(record: any) {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured — cannot save security scan.')
  const { data, error } = await supabase.from('security_scans').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteSecurityScans(id: string) {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured — cannot delete security scan.')
  const { error } = await supabase.from('security_scans').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return true
}
