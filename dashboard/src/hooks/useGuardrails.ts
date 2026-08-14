// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// useGuardrails — React Query wrappers for guardrail_events (list + ack +
// escalate-to-incident) and guardrail_rules (CRUD). Mutations invalidate the
// relevant queries (useAiiaData pattern); services throw so callers surface a
// real error toast — success toasts fire only after the write resolves.
// A Realtime INSERT subscription keeps the event list live.

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  fetchGuardrailEvents, acknowledgeGuardrailEvent, createIncidentFromEvent,
  fetchGuardrailRules, createGuardrailRule, updateGuardrailRule, deleteGuardrailRule,
  type GuardrailEventFilters, type GuardrailRule, type EscalationInput,
} from '@/services/guardrailService'

export function useGuardrailEvents(filters: GuardrailEventFilters = {}) {
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: ['guardrail-events', filters],
    queryFn: () => fetchGuardrailEvents(filters),
    staleTime: 15_000,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['guardrail-events'] })

  const acknowledge = useMutation({
    mutationFn: ({ id, userId, reason }: { id: string; userId: string; reason: string }) =>
      acknowledgeGuardrailEvent(id, { userId, reason }),
    onSuccess: invalidate,
  })

  const escalate = useMutation({
    mutationFn: (input: EscalationInput) => createIncidentFromEvent(input),
    // The Incident Response module shares the ['incidents'] cache key.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  })

  // Live event feed: push, not poll.
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return
    const channel = supabase
      .channel('guardrail-events-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'guardrail_events' },
        () => invalidate(),
      )
      .subscribe()
    return () => { supabase?.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc])

  return {
    events: list.data ?? [],
    isLoading: list.isLoading,
    error: (list.error as Error | null) ?? null,
    acknowledge,
    escalate,
  }
}

export function useGuardrailRules() {
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: ['guardrail-rules'],
    queryFn: fetchGuardrailRules,
    staleTime: 30_000,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['guardrail-rules'] })

  const create = useMutation({ mutationFn: createGuardrailRule, onSuccess: invalidate })
  const update = useMutation({
    mutationFn: ({ id, patch }: {
      id: string
      patch: Partial<Pick<GuardrailRule, 'name' | 'ruleType' | 'condition' | 'action' | 'priority' | 'enabled'>>
    }) => updateGuardrailRule(id, patch),
    onSuccess: invalidate,
  })
  const remove = useMutation({ mutationFn: deleteGuardrailRule, onSuccess: invalidate })

  return {
    rules: list.data ?? [],
    isLoading: list.isLoading,
    error: (list.error as Error | null) ?? null,
    create,
    update,
    remove,
  }
}
