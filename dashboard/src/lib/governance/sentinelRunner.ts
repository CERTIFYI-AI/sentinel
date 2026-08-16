/**
 * Sentinel fleet runner — executes continuous-mode sweeps in the browser
 * (RLS-scoped) and records every run in the same observability plane the
 * cascade agents use:
 *
 *   * agent_executions      — one row per sweep (event_type SENTINEL_SWEEP)
 *   * mesh_agent_state      — per-org heartbeat / enable state
 *   * governance_events     — whatever the sweeps emit (feeds the cascades)
 *
 * The server twin (supabase/functions/mesh-sentinels) runs the same fleet
 * on a pg_cron schedule for orgs with no browser session open. Both paths
 * write the same ledgers, so the mesh UI reads one truth.
 */
import { supabase, isSupabaseConfigured } from '../supabase'
import { emitEvent, type EmitOptions } from './eventBus'
import { SENTINELS } from '../../agents/sentinels'
import type { SentinelContext, SentinelResult } from '../../agents/sentinels'

const SWEEP_TIMEOUT_MS = 20_000
const MAX_WINDOW_MS = 24 * 3600_000

export interface FleetSweepRun {
  agent: string
  status: 'succeeded' | 'failed' | 'skipped'
  findings: number
  durationMs: number
  summary: string
  error?: string
}

interface MeshAgentStateRow {
  agent_name: string
  is_enabled: boolean
  last_heartbeat_at: string | null
  total_sweeps: number | null
  consecutive_failures: number | null
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`sentinel-timeout-${ms}ms`)), ms)
    p.then((v) => { clearTimeout(t); resolve(v) }, (e) => { clearTimeout(t); reject(e) })
  })
}

/**
 * Run the fleet (or a subset) once for the caller's org. Throws only on
 * total misconfiguration; per-sentinel failures are recorded and returned.
 */
export async function runFleetSweep(orgId: string, only?: string[]): Promise<FleetSweepRun[]> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — cannot run a mesh sweep.')
  }

  const { data: stateRows } = await supabase
    .from('mesh_agent_state')
    .select('agent_name, is_enabled, last_heartbeat_at, total_sweeps, consecutive_failures')
    .eq('org_id', orgId)
  const stateByName = new Map(((stateRows ?? []) as MeshAgentStateRow[]).map((r) => [r.agent_name, r]))

  const results: FleetSweepRun[] = []

  for (const sentinel of SENTINELS) {
    if (only && !only.includes(sentinel.name)) continue

    const state = stateByName.get(sentinel.name)
    if (state && !state.is_enabled && !only) {
      // Paused sentinels are skipped on full sweeps but can be run explicitly.
      continue
    }

    const sinceMs = state?.last_heartbeat_at
      ? Math.max(new Date(state.last_heartbeat_at).getTime(), Date.now() - MAX_WINDOW_MS)
      : Date.now() - MAX_WINDOW_MS

    const ctx: SentinelContext = {
      orgId,
      since: new Date(sinceMs).toISOString(),
      now: () => Date.now(),
      log: (m) => console.info(`[mesh:${sentinel.name}] ${m}`),
      emit: (type: string, payload: Record<string, unknown>, options?: EmitOptions) =>
        emitEvent(type, `mesh-sentinel:${sentinel.name}`, payload, orgId, options),
    }

    const started = Date.now()
    let result: SentinelResult
    try {
      result = await withTimeout(sentinel.run(ctx), SWEEP_TIMEOUT_MS)
    } catch (e) {
      result = { status: 'failed', findings: [], summary: 'Sweep crashed.', error: (e as Error).message }
    }
    const durationMs = Date.now() - started

    // Ledger: same table the cascade agents write, so the mesh UI shows both.
    await supabase.from('agent_executions').insert({
      org_id: orgId,
      agent_name: sentinel.name,
      event_type: 'SENTINEL_SWEEP',
      status: result.status,
      finished_at: new Date().toISOString(),
      duration_ms: durationMs,
      output: {
        summary: result.summary,
        findings: result.findings.slice(0, 50),
        metrics: result.metrics ?? {},
      },
      error: result.error ?? null,
      trace_id: `sweep-${started.toString(36)}`,
    })

    // Heartbeat.
    await supabase.from('mesh_agent_state').upsert(
      {
        org_id: orgId,
        agent_name: sentinel.name,
        last_heartbeat_at: new Date().toISOString(),
        last_sweep_status: result.status,
        last_findings_count: result.findings.length,
        total_sweeps: (state?.total_sweeps ?? 0) + 1,
        consecutive_failures: result.status === 'failed' ? (state?.consecutive_failures ?? 0) + 1 : 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,agent_name' },
    )

    results.push({
      agent: sentinel.name,
      status: result.status,
      findings: result.findings.length,
      durationMs,
      summary: result.summary,
      error: result.error,
    })
  }

  return results
}

/** Pause or resume one sentinel for the caller's org. Throws on failure. */
export async function setSentinelEnabled(orgId: string, agentName: string, isEnabled: boolean): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('mesh_agent_state').upsert(
    { org_id: orgId, agent_name: agentName, is_enabled: isEnabled, updated_at: new Date().toISOString() },
    { onConflict: 'org_id,agent_name' },
  )
  if (error) throw new Error(error.message)
}
