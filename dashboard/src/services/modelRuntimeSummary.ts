// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Per-model runtime rollup for the model record's "Runtime & Operations"
// panel. Rather than linking blindly to sibling modules, the record shows the
// real figures each of those modules holds for THIS model.
//
// These are count/aggregate queries scoped to one model id — the detail page
// never pulls whole tables. Counts use `head: true` so no rows cross the wire;
// only cost/token usage fetches rows, and only the two numeric columns it sums.
// Every field is nullable: null means "not measured", never zero, so an empty
// org shows an honest dash instead of a fabricated 0.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface ModelRuntimeSummary {
  fallbackEvents: number | null
  fallbackFailures: number | null
  toolCalls: number | null
  toolCallErrors: number | null
  prompts: number | null
  tokens30d: number | null
  cost30d: number | null
}

const EMPTY: ModelRuntimeSummary = {
  fallbackEvents: null, fallbackFailures: null, toolCalls: null,
  toolCallErrors: null, prompts: null, tokens30d: null, cost30d: null,
}

/** Exact row count for a filtered query, without transferring the rows. */
async function countOf(
  table: string,
  apply: (q: any) => any,
): Promise<number | null> {
  if (!supabase) return null
  const { count, error } = await apply(supabase.from(table).select('id', { count: 'exact', head: true }))
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function fetchModelRuntimeSummary(modelId?: string): Promise<ModelRuntimeSummary> {
  if (!isSupabaseConfigured() || !supabase || !modelId) return EMPTY

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)

  const [fallbackEvents, fallbackFailures, toolCalls, toolCallErrors, prompts, usage] =
    await Promise.all([
      countOf('fallback_logs', (q) => q.eq('primary_model_id', modelId)),
      countOf('fallback_logs', (q) => q.eq('primary_model_id', modelId).eq('succeeded', false)),
      countOf('tool_call_logs', (q) => q.eq('model_id', modelId)),
      countOf('tool_call_logs', (q) => q.eq('model_id', modelId).neq('status', 'success')),
      countOf('prompt_registry', (q) => q.contains('used_by_model_ids', [modelId])),
      supabase
        .from('cost_token_usage')
        .select('total_tokens, cost_usd')
        .eq('model_id', modelId)
        .gte('usage_date', since),
    ])

  if (usage.error) throw new Error(usage.error.message)
  const rows = usage.data ?? []
  // No usage rows means nothing was measured in the window — report null, not 0.
  const tokens30d = rows.length
    ? rows.reduce((s: number, r: any) => s + (Number(r.total_tokens) || 0), 0)
    : null
  const cost30d = rows.length
    ? rows.reduce((s: number, r: any) => s + (Number(r.cost_usd) || 0), 0)
    : null

  return { fallbackEvents, fallbackFailures, toolCalls, toolCallErrors, prompts, tokens30d, cost30d }
}
