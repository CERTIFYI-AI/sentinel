// SPDX-License-Identifier: Apache-2.0
// useCostMetrics — real aggregates over `cost_token_usage` (daily batch data).
// Full rewrite: every number here is computed from fetched rows; nothing is
// seeded, randomized, or scaled by a fake multiplier. The date range and the
// optional model filter are REAL query filters (applied server-side).

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchCostUsage, setModelBudget, type CostUsageRow } from '@/services/costUsageService'

export type CostRangeKey = '7d' | '14d' | '30d'
export const COST_RANGE_DAYS: Record<CostRangeKey, number> = { '7d': 7, '14d': 14, '30d': 30 }

export interface DailyPoint {
  date: string // YYYY-MM-DD
  cost: number
  tokens: number
  requests: number
}

export interface ModelCostAgg {
  modelId: string // ai_models uuid (charts are keyed by this, never by name)
  modelName: string // stored snapshot; resolve registry name at render time
  cost: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  requests: number
  budgetLimitUsd: number | null
  latestDayCost: number // spend on the most recent usage_date in the window
  latestDayDate: string | null
}

export interface BudgetAlert {
  modelId: string
  modelName: string
  latestDayCost: number
  budgetLimitUsd: number
  pct: number // latestDayCost / budgetLimitUsd
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
}

export function useCostMetrics(range: CostRangeKey, modelId?: string | null) {
  const qc = useQueryClient()
  const days = COST_RANGE_DAYS[range]
  // Inclusive window of N calendar days ending today.
  const sinceDate = isoDaysAgo(days - 1)

  const query = useQuery({
    queryKey: ['cost-usage', range, modelId ?? 'all'],
    queryFn: () => fetchCostUsage({ sinceDate, modelId: modelId ?? undefined }),
    staleTime: 60_000,
  })
  const rows: CostUsageRow[] = useMemo(() => query.data ?? [], [query.data])

  const metrics = useMemo(() => {
    // ── Daily trend ─────────────────────────────────────────────────────────
    const byDate = new Map<string, DailyPoint>()
    for (const r of rows) {
      const p = byDate.get(r.usageDate) ?? { date: r.usageDate, cost: 0, tokens: 0, requests: 0 }
      p.cost += r.costUsd
      p.tokens += r.totalTokens
      p.requests += r.requestCount
      byDate.set(r.usageDate, p)
    }
    const dailyTrend = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
    const dataThrough = dailyTrend.length > 0 ? dailyTrend[dailyTrend.length - 1].date : null

    // ── Per-model aggregates (keyed by ai_models uuid) ──────────────────────
    const byModel = new Map<string, ModelCostAgg>()
    for (const r of rows) {
      if (!r.modelId) continue // rows without a registry link can't be keyed or deep-linked
      const m = byModel.get(r.modelId) ?? {
        modelId: r.modelId,
        modelName: r.modelName ?? '',
        cost: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, requests: 0,
        budgetLimitUsd: null, latestDayCost: 0, latestDayDate: null,
      }
      m.cost += r.costUsd
      m.promptTokens += r.promptTokens
      m.completionTokens += r.completionTokens
      m.totalTokens += r.totalTokens
      m.requests += r.requestCount
      if (r.budgetLimitUsd != null) m.budgetLimitUsd = r.budgetLimitUsd
      if (m.latestDayDate === null || r.usageDate > m.latestDayDate) {
        m.latestDayDate = r.usageDate
        m.latestDayCost = r.costUsd
      }
      byModel.set(r.modelId, m)
    }
    const costByModel = [...byModel.values()].sort((a, b) => b.cost - a.cost)

    // ── Totals ──────────────────────────────────────────────────────────────
    const totalCost = rows.reduce((s, r) => s + r.costUsd, 0)
    const totalTokens = rows.reduce((s, r) => s + r.totalTokens, 0)
    const totalRequests = rows.reduce((s, r) => s + r.requestCount, 0)
    const activeModels = byModel.size
    const costPer1kTokens = totalTokens > 0 ? (totalCost / totalTokens) * 1000 : null

    // ── Week-over-week deltas — computed only when the window really spans
    //    two full weeks of data (never extrapolated). ────────────────────────
    let costWoWPct: number | null = null
    let tokensWoWPct: number | null = null
    if (dailyTrend.length >= 14) {
      const last7 = dailyTrend.slice(-7)
      const prev7 = dailyTrend.slice(-14, -7)
      const sum = (pts: DailyPoint[], k: 'cost' | 'tokens') => pts.reduce((s, p) => s + p[k], 0)
      const prevCost = sum(prev7, 'cost')
      const prevTokens = sum(prev7, 'tokens')
      if (prevCost > 0) costWoWPct = ((sum(last7, 'cost') - prevCost) / prevCost) * 100
      if (prevTokens > 0) tokensWoWPct = ((sum(last7, 'tokens') - prevTokens) / prevTokens) * 100
    }

    // ── Budget alerts: models whose latest-day spend is ≥80% of their daily
    //    budget_limit_usd. Empty array ⇒ the page shows no banner. ───────────
    const budgetAlerts: BudgetAlert[] = costByModel
      .filter(m => m.budgetLimitUsd != null && m.budgetLimitUsd > 0 && m.latestDayCost >= 0.8 * m.budgetLimitUsd)
      .map(m => ({
        modelId: m.modelId,
        modelName: m.modelName,
        latestDayCost: m.latestDayCost,
        budgetLimitUsd: m.budgetLimitUsd as number,
        pct: m.latestDayCost / (m.budgetLimitUsd as number),
      }))

    return {
      dailyTrend, costByModel, dataThrough,
      totalCost, totalTokens, totalRequests, activeModels, costPer1kTokens,
      costWoWPct, tokensWoWPct, budgetAlerts,
    }
  }, [rows])

  const saveBudget = useMutation({
    mutationFn: ({ modelId: id, limitUsd }: { modelId: string; limitUsd: number | null }) =>
      setModelBudget(id, limitUsd),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-usage'] }),
  })

  return {
    rows,
    ...metrics,
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
    saveBudget,
  }
}
