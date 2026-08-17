// SPDX-License-Identifier: Apache-2.0
// React Query hooks for the Agentic Mesh: sentinel fleet + shared ledgers,
// with realtime invalidation on new events/executions and mutations for
// running sweeps (client or server) and pausing sentinels.

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  fetchMeshFleet, fetchMeshExecutions, fetchMeshEvents, invokeServerSweep,
} from '../services/meshFleetService'
import { runFleetSweep, setSentinelEnabled } from '../lib/governance/sentinelRunner'

export function useMeshFleet(orgId: string | null) {
  const qc = useQueryClient()

  const fleet = useQuery({
    queryKey: ['mesh-fleet', orgId],
    queryFn: () => fetchMeshFleet(orgId as string),
    enabled: !!orgId,
    staleTime: 15_000,
  })
  const executions = useQuery({
    queryKey: ['mesh-executions', orgId],
    queryFn: () => fetchMeshExecutions(orgId as string),
    enabled: !!orgId,
    staleTime: 10_000,
  })
  const events = useQuery({
    queryKey: ['mesh-events', orgId],
    queryFn: () => fetchMeshEvents(orgId as string),
    enabled: !!orgId,
    staleTime: 10_000,
  })

  // Realtime: any new bus event or execution refreshes the mesh views.
  useEffect(() => {
    if (!orgId || !isSupabaseConfigured() || !supabase) return
    const channel = supabase
      .channel(`agentic-mesh-${orgId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'governance_events', filter: `org_id=eq.${orgId}` },
        () => { void qc.invalidateQueries({ queryKey: ['mesh-events', orgId] }) })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_executions', filter: `org_id=eq.${orgId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ['mesh-executions', orgId] })
          void qc.invalidateQueries({ queryKey: ['mesh-fleet', orgId] })
        })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [orgId, qc])

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: ['mesh-fleet', orgId] })
    void qc.invalidateQueries({ queryKey: ['mesh-executions', orgId] })
    void qc.invalidateQueries({ queryKey: ['mesh-events', orgId] })
  }

  /** Run sweeps in this browser session (RLS-scoped, immediate). */
  const runClientSweep = useMutation({
    mutationFn: (agents?: string[]) => runFleetSweep(orgId as string, agents),
    onSettled: invalidateAll,
  })

  /** Ask the server-side always-on runner to sweep now. */
  const runServerSweep = useMutation({
    mutationFn: (agents?: string[]) => invokeServerSweep(orgId as string, agents),
    onSettled: invalidateAll,
  })

  const toggleSentinel = useMutation({
    mutationFn: ({ agentName, isEnabled }: { agentName: string; isEnabled: boolean }) =>
      setSentinelEnabled(orgId as string, agentName, isEnabled),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['mesh-fleet', orgId] }) },
  })

  return {
    fleet: fleet.data ?? [],
    fleetLoading: fleet.isLoading,
    fleetError: fleet.error as Error | null,
    executions: executions.data ?? [],
    events: events.data ?? [],
    runClientSweep,
    runServerSweep,
    toggleSentinel,
  }
}
