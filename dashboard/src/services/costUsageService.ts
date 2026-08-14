// SPDX-License-Identifier: Apache-2.0
// costUsageService — real reads/writes for the org-scoped `cost_token_usage`
// table (daily batch LLM usage: one row per model per usage_date).
//
// Pattern follows modelService.ts: direct Supabase calls, camelCase mapping,
// writes throw on failure so callers surface a real error toast.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type CostUsageRow = {
  id: string
  usageDate: string // YYYY-MM-DD
  modelId: string | null // uuid → ai_models.id
  modelName: string | null // snapshot; resolve registry name at render time
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costUsd: number
  requestCount: number
  budgetLimitUsd: number | null // daily budget for this model, if set
}

function mapRow(r: Record<string, unknown>): CostUsageRow {
  return {
    id: String(r.id),
    usageDate: String(r.usage_date),
    modelId: (r.model_id as string) ?? null,
    modelName: (r.model_name as string) ?? null,
    promptTokens: Number(r.prompt_tokens ?? 0),
    completionTokens: Number(r.completion_tokens ?? 0),
    totalTokens: Number(r.total_tokens ?? 0),
    costUsd: Number(r.cost_usd ?? 0),
    requestCount: Number(r.request_count ?? 0),
    budgetLimitUsd: r.budget_limit_usd == null ? null : Number(r.budget_limit_usd),
  }
}

export interface FetchCostUsageOptions {
  /** Inclusive lower bound on usage_date (YYYY-MM-DD) — a real query filter. */
  sinceDate?: string
  /** Restrict to a single model (uuid) — a real query filter. */
  modelId?: string
}

export async function fetchCostUsage(opts: FetchCostUsageOptions = {}): Promise<CostUsageRow[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('cost_token_usage').select('*').order('usage_date', { ascending: true })
  if (opts.sinceDate) q = q.gte('usage_date', opts.sinceDate)
  if (opts.modelId) q = q.eq('model_id', opts.modelId)
  const { data, error } = await q
  if (error) { console.warn('[costUsageService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(mapRow)
}

// Budget persistence choice: `budget_limit_usd` lives on the usage rows (there is
// no separate per-model budget table), so a model's budget is stored by updating
// ALL of that model's rows. This keeps any date-window query self-consistent —
// whichever rows a view fetches, they carry the current limit — instead of only
// the latest row knowing about it. Passing null clears the budget.
export async function setModelBudget(modelId: string, limitUsd: number | null): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save budget.')
  const { error } = await supabase
    .from('cost_token_usage')
    .update({ budget_limit_usd: limitUsd })
    .eq('model_id', modelId)
  if (error) { console.warn('[costUsageService] setModelBudget:', error.message); throw new Error(error.message) }
}
