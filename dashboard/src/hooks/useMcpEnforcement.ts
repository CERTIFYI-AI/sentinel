// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Policy decisions from the MCP gateway, live.
//
// Realtime rather than polling, because this is an enforcement feed: a denial
// an operator sees five minutes late is a denial they cannot act on. The
// subscription is additive — it invalidates the query rather than splicing
// rows in — so the list stays consistent with RLS and with ordering instead of
// drifting from the server's view.

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  fetchPolicyDecisions,
  countDecisions,
  countsByTool,
  topReasons,
  type PolicyDecision,
} from '@/services/mcpEnforcementService'

const KEY = ['mcp_policy_decisions']

export function usePolicyDecisions(limit = 200) {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: [...KEY, limit],
    queryFn: () => fetchPolicyDecisions(limit),
    // Short: an enforcement feed that is stale is not a feed.
    staleTime: 10_000,
  })

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return
    const channel = supabase
      .channel('mcp-policy-decisions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mcp_policy_decisions' },
        () => qc.invalidateQueries({ queryKey: KEY }),
      )
      .subscribe()
    return () => {
      void supabase?.removeChannel(channel)
    }
  }, [qc])

  const rows: PolicyDecision[] = q.data ?? []
  return {
    data: rows,
    counts: countDecisions(rows),
    byTool: countsByTool(rows),
    reasons: topReasons(rows),
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error as Error | null,
    refetch: q.refetch,
  }
}
