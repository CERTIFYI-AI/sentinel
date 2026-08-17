// SPDX-License-Identifier: Apache-2.0
// Agentic Mesh fleet service — reads the sentinel catalog (agent_registry,
// run_mode='continuous'), per-org runtime state (mesh_agent_state) and the
// shared execution/event ledgers. Writes throw so callers surface real errors.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface MeshSentinel {
  id: string
  agentName: string
  agentType?: string
  description?: string
  enterpriseProblem?: string
  agenticSolution?: string
  sweepIntervalMinutes: number
  triggerEvents: string[]
  targetModules: string[]
  priority?: number
  // Per-org runtime state (mesh_agent_state); null until the first sweep.
  isEnabled: boolean
  lastHeartbeatAt: string | null
  lastSweepStatus: string | null
  lastFindingsCount: number
  totalSweeps: number
  consecutiveFailures: number
}

export interface MeshExecution {
  id: string
  agentName: string
  eventType: string
  status: string
  durationMs: number | null
  output: { summary?: string; findings?: MeshFinding[]; metrics?: Record<string, number> } | null
  error: string | null
  startedAt: string
}

export interface MeshFinding {
  title: string
  severity: string
  entityType?: string
  entityId?: string
  detail?: string
}

export interface MeshEvent {
  id: string
  eventType: string
  sourceModule: string
  status: string
  triggeredAgents: string[]
  cascadeDepth: number
  createdAt: string
  payload: Record<string, unknown>
}

interface RegistryRow {
  id: string
  agent_name: string
  agent_type: string | null
  description: string | null
  enterprise_problem: string | null
  agentic_solution: string | null
  sweep_interval_minutes: number | null
  trigger_events: string[] | null
  target_modules: string[] | null
  priority: number | null
}

interface StateRow {
  agent_name: string
  is_enabled: boolean
  last_heartbeat_at: string | null
  last_sweep_status: string | null
  last_findings_count: number | null
  total_sweeps: number | null
  consecutive_failures: number | null
}

/** Sentinel catalog joined with the caller org's runtime state. */
export async function fetchMeshFleet(orgId: string): Promise<MeshSentinel[]> {
  if (!isSupabaseConfigured() || !supabase) return []

  const [catalog, state] = await Promise.all([
    supabase
      .from('agent_registry')
      .select('id, agent_name, agent_type, description, enterprise_problem, agentic_solution, sweep_interval_minutes, trigger_events, target_modules, priority')
      .eq('run_mode', 'continuous')
      .order('priority'),
    supabase
      .from('mesh_agent_state')
      .select('agent_name, is_enabled, last_heartbeat_at, last_sweep_status, last_findings_count, total_sweeps, consecutive_failures')
      .eq('org_id', orgId),
  ])
  if (catalog.error) throw new Error(catalog.error.message)

  const stateByName = new Map(((state.data ?? []) as StateRow[]).map((s) => [s.agent_name, s]))
  return ((catalog.data ?? []) as RegistryRow[]).map((r) => {
    const s = stateByName.get(r.agent_name)
    return {
      id: r.id,
      agentName: r.agent_name,
      agentType: r.agent_type ?? undefined,
      description: r.description ?? undefined,
      enterpriseProblem: r.enterprise_problem ?? undefined,
      agenticSolution: r.agentic_solution ?? undefined,
      sweepIntervalMinutes: r.sweep_interval_minutes ?? 15,
      triggerEvents: r.trigger_events ?? [],
      targetModules: r.target_modules ?? [],
      priority: r.priority ?? undefined,
      isEnabled: s?.is_enabled ?? true,
      lastHeartbeatAt: s?.last_heartbeat_at ?? null,
      lastSweepStatus: s?.last_sweep_status ?? null,
      lastFindingsCount: s?.last_findings_count ?? 0,
      totalSweeps: s?.total_sweeps ?? 0,
      consecutiveFailures: s?.consecutive_failures ?? 0,
    }
  })
}

/** Recent execution ledger — cascade agents and sentinel sweeps alike. */
export async function fetchMeshExecutions(orgId: string, limit = 100): Promise<MeshExecution[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('agent_executions')
    .select('id, agent_name, event_type, status, duration_ms, output, error, started_at')
    .eq('org_id', orgId)
    .order('started_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    agentName: r.agent_name as string,
    eventType: r.event_type as string,
    status: r.status as string,
    durationMs: (r.duration_ms as number | null) ?? null,
    output: (r.output as MeshExecution['output']) ?? null,
    error: (r.error as string | null) ?? null,
    startedAt: r.started_at as string,
  }))
}

/** Recent governance bus events. */
export async function fetchMeshEvents(orgId: string, limit = 50): Promise<MeshEvent[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('governance_events')
    .select('id, event_type, source_module, status, triggered_agents, cascade_depth, created_at, payload')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    eventType: r.event_type as string,
    sourceModule: (r.source_module as string) ?? '',
    status: (r.status as string) ?? 'pending',
    triggeredAgents: (r.triggered_agents as string[]) ?? [],
    cascadeDepth: (r.cascade_depth as number) ?? 0,
    createdAt: r.created_at as string,
    payload: (r.payload as Record<string, unknown>) ?? {},
  }))
}

/**
 * Invoke the server-side always-on runner (mesh-sentinels edge function)
 * for the caller's org. Throws when the function is unreachable — the UI
 * shows the real error, never a fake success.
 */
export async function invokeServerSweep(orgId: string, agents?: string[]): Promise<unknown> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.functions.invoke('mesh-sentinels', {
    body: { orgId, agents },
  })
  if (error) throw new Error(error.message ?? 'mesh-sentinels invocation failed')
  return data
}
