import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  fetchPerformanceMetrics, fetchBiasAudits, fetchExplanation, fetchLineage,
} from '@/services/modelAnalyticsService'

// Real-time analytics for the Model Detail page. The Performance query is
// backed by model_performance_metrics; a Supabase Realtime channel invalidates
// it the instant the proxy (or an ingestion job) writes a new telemetry row, so
// the chart is live without polling.
export function useModelAnalytics(modelId: string | undefined, modelName: string) {
  const qc = useQueryClient()
  const enabled = !!modelId

  const performance = useQuery({
    queryKey: ['model-perf', modelId],
    queryFn: () => fetchPerformanceMetrics(modelId!, modelName),
    enabled, staleTime: 15_000,
  })
  const bias = useQuery({
    queryKey: ['model-bias', modelId],
    queryFn: () => fetchBiasAudits(modelId!),
    enabled, staleTime: 30_000,
  })
  const explanation = useQuery({
    queryKey: ['model-explanation', modelId],
    queryFn: () => fetchExplanation(modelId!),
    enabled, staleTime: 30_000,
  })
  const lineage = useQuery({
    queryKey: ['model-lineage', modelId],
    queryFn: () => fetchLineage(modelId!, modelName),
    enabled, staleTime: 30_000,
  })

  // Live updates: push, not poll. Subscribe to inserts on this model's metrics.
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured() || !supabase) return
    const channel = supabase
      .channel(`model-perf-${modelId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'model_performance_metrics', filter: `model_id=eq.${modelId}` },
        () => qc.invalidateQueries({ queryKey: ['model-perf', modelId] }))
      .subscribe()
    return () => { supabase?.removeChannel(channel) }
  }, [enabled, modelId, qc])

  return {
    performance: performance.data ?? [],
    performanceLoading: performance.isLoading,
    bias: bias.data ?? [],
    biasLoading: bias.isLoading,
    explanation: explanation.data ?? null,
    explanationLoading: explanation.isLoading,
    lineage: lineage.data ?? null,
    lineageLoading: lineage.isLoading,
  }
}
