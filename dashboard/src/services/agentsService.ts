// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// agentsService — org-scoped access to the legacy `agents` table (raw
// network-discovery rows). The Agent Discovery / Shadow AI / Agent Detail
// pages read the canonical agent_gov_registry via agentRecordHooks
// (src/hooks/queries/useAgentGovCrud.ts); this service exists only for the
// plain `agents` table. Platform contract (see CLAUDE.md): reads throw so
// callers render real error states, writes THROW on failure so the UI can
// never report a false success.

import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface AgentsFilters {
  status?: string
  type?: string
}

export async function fetchAllAgents(filters: AgentsFilters = {}) {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('agents').select('*').order('created_at', { ascending: false })
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.type) q = q.eq('type', filters.type)
  const { data, error } = await q
  if (error) { console.warn('[agentsService] fetch:', error.message); throw new Error(error.message) }
  return data ?? []
}

export async function fetchAgentsById(id: string) {
  if (!isSupabaseConfigured() || !supabase || !id) return null
  const { data, error } = await supabase.from('agents').select('*').eq('id', id).maybeSingle()
  if (error) { console.warn('[agentsService] get:', error.message); throw new Error(error.message) }
  return data ?? null
}

// Writes throw on any failure (config / RLS / network) — never a false success.
export async function upsertAgents(record: Record<string, unknown>) {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save agent.')
  const { data, error } = await supabase.from('agents').upsert(record).select().single()
  if (error) { console.warn('[agentsService] upsert:', error.message); throw new Error(error.message) }
  return data
}

export async function deleteAgents(id: string) {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete agent.')
  const { error } = await supabase.from('agents').delete().eq('id', id)
  if (error) { console.warn('[agentsService] delete:', error.message); throw new Error(error.message) }
}
