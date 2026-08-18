// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// bcpPlansService — the real, org-scoped `bcp_plans` table.
//
// V8 re-audit: this service previously returned SEED_BCP_PLANS (fabricated
// records keyed MDL-00x) whenever the table was empty OR the query failed —
// invented plans presented to the user as their own. Now: an empty table is
// an empty array (the page renders an honest empty state), and a failed query
// THROWS so the page can render a real error state. Writes throw too — no
// fake success (CLAUDE.md, First principle #4).

import { supabase, isSupabaseConfigured } from '@/lib/supabase'


export async function fetchAllBcpPlans(filters: Record<string, any> = {}) {
  if (!isSupabaseConfigured()) return []
  let q = supabase.from('bcp_plans').select('*').order('created_at', { ascending: false })
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.type) q = q.eq('type', filters.type)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchBcpPlansById(id: string) {
  if (!isSupabaseConfigured() || !id) return null
  const { data, error } = await supabase.from('bcp_plans').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ?? null
}

export async function upsertBcpPlans(record: any) {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured — cannot save BCP plan.')
  const { data, error } = await supabase.from('bcp_plans').upsert(record).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteBcpPlans(id: string) {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured — cannot delete BCP plan.')
  const { error } = await supabase.from('bcp_plans').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return true
}
