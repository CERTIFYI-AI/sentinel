// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// useLiveTraces — React Query over the real live_traces table plus a Supabase
// Realtime INSERT subscription (useModelAnalytics pattern): live means push,
// not poll. `isLive` reflects the REAL channel state — the page's live
// indicator must never claim a connection that does not exist.

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  fetchLiveTraces, fetchTraceStats24h,
  type LiveTraceFilters, type TraceStats24h,
} from '@/services/liveTraceService'

export function useLiveTraces(filters: LiveTraceFilters = {}) {
  const qc = useQueryClient()
  const [isLive, setIsLive] = useState(false)

  const list = useQuery({
    queryKey: ['live-traces', filters],
    queryFn: () => fetchLiveTraces(filters),
    staleTime: 10_000,
  })

  const stats = useQuery<TraceStats24h>({
    queryKey: ['live-trace-stats-24h'],
    queryFn: fetchTraceStats24h,
    staleTime: 30_000,
  })

  // New rows appear when actually inserted: invalidate on every INSERT.
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return
    const channel = supabase
      .channel('live-traces-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_traces' },
        () => {
          qc.invalidateQueries({ queryKey: ['live-traces'] })
          qc.invalidateQueries({ queryKey: ['live-trace-stats-24h'] })
        },
      )
      .subscribe(status => setIsLive(status === 'SUBSCRIBED'))
    return () => {
      setIsLive(false)
      supabase?.removeChannel(channel)
    }
  }, [qc])

  return {
    traces: list.data ?? [],
    isLoading: list.isLoading,
    error: (list.error as Error | null) ?? null,
    stats: stats.data ?? null,
    statsLoading: stats.isLoading,
    isLive,
  }
}
