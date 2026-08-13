// SPDX-License-Identifier: Apache-2.0
// Prompt Registry service — reads/writes the RLS-governed `prompt_registry` table.
// The table's RLS admits rows for the caller's org OR tenant_id 'TNT-001' (the
// shared demo tenant + table default), so writes use 'TNT-001'. Maps between the
// snake_case DB columns and the camelCase UI PromptRecord shape.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { PromptRecord } from '../data/seed'

const TENANT_ID = 'TNT-001'

function rowToPrompt(r: any): PromptRecord {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    status: r.status,
    model: r.model ?? '',
    owner: r.owner ?? '',
    currentVersion: r.current_version ?? '1.0.0',
    description: r.description ?? '',
    content: r.content ?? '',
    tags: Array.isArray(r.tags) ? r.tags : [],
    usedBy: Array.isArray(r.used_by) ? r.used_by : [],
    tokenCount: r.token_count ?? 0,
    versions: Array.isArray(r.versions) ? r.versions : [],
    approvedBy: r.approved_by ?? null,
    approvalDate: r.approval_date ?? null,
    lastModified: r.last_modified ?? r.updated_at ?? '',
    createdDate: r.created_date ?? r.created_at ?? '',
  } as PromptRecord
}

function promptToRow(r: PromptRecord): Record<string, any> {
  return {
    id: r.id,
    tenant_id: TENANT_ID,
    name: r.name,
    category: r.category,
    status: r.status,
    model: r.model,
    owner: r.owner,
    current_version: r.currentVersion,
    description: r.description,
    content: r.content,
    tags: r.tags ?? [],
    used_by: r.usedBy ?? [],
    token_count: r.tokenCount ?? 0,
    versions: r.versions ?? [],
    approved_by: r.approvedBy ?? null,
    approval_date: r.approvalDate ?? null,
    last_modified: r.lastModified,
    created_date: r.createdDate,
  }
}

export async function fetchPromptRecords(): Promise<PromptRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase.from('prompt_registry').select('*').order('last_modified', { ascending: false })
  if (error) { console.warn('[promptService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(rowToPrompt)
}

// Writes throw on failure so create/approve/reject actions surface a real error
// instead of a false success. Never swallow to null.
export async function upsertPromptRecord(record: PromptRecord): Promise<PromptRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save prompt.')
  const { data, error } = await supabase.from('prompt_registry').upsert(promptToRow(record)).select().single()
  if (error) { console.warn('[promptService] upsert:', error.message); throw new Error(error.message) }
  return rowToPrompt(data)
}

export async function deletePromptRecord(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete prompt.')
  const { error } = await supabase.from('prompt_registry').delete().eq('id', id)
  if (error) { console.warn('[promptService] delete:', error.message); throw new Error(error.message) }
}
