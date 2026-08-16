/**
 * Agentic Mesh — continuous sentinel fleet types.
 *
 * A sentinel is an always-on governance agent: instead of reacting to a
 * single bus event (the 27 cascade agents), it *sweeps* org data on an
 * interval, intercepts problems, and emits events into the same governance
 * bus so the reactive cascades fire. One mesh, two run modes.
 */
import type { EmitOptions } from '../../lib/governance/eventBus'

export interface SentinelFinding {
  title: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  /** Entity linkage — canonical platform ids (ai_models.id etc.), never names. */
  entityType?: 'model' | 'incident' | 'dataset' | 'credential' | 'agent' | 'control' | 'trace'
  entityId?: string
  detail?: string
}

export interface SentinelContext {
  orgId: string
  /** Start of the sweep window (previous heartbeat, capped at 24h back). */
  since: string
  now: () => number
  log: (msg: string) => void
  /** Emit into the shared governance bus — triggers the reactive cascades. */
  emit: (
    type: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ) => Promise<unknown>
}

export interface SentinelResult {
  status: 'succeeded' | 'failed' | 'skipped'
  findings: SentinelFinding[]
  /** One-line honest summary of what was actually scanned. */
  summary: string
  error?: string
  metrics?: Record<string, number>
}

export type SentinelRun = (ctx: SentinelContext) => Promise<SentinelResult>

export interface SentinelDefinition {
  /** Must match the agent_registry.agent_name seed exactly. */
  name: string
  run: SentinelRun
}
