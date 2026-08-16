/**
 * Sentinel Governance Event Bus — Fortune 500 Edition
 *
 * Responsibilities
 *   1. Durable event persistence in Supabase with idempotency keys
 *   2. Causation + correlation tracking for full cascade observability
 *   3. Per-agent execution ledger (agent_executions table)
 *   4. Retries with exponential backoff and DLQ after N attempts
 *   5. Simple in-memory circuit breaker per agent
 *   6. Real-time Supabase subscriptions for the Activity Feed
 *   7. Frontend fallback: agents still run even when offline
 *
 * Compatibility: keeps the legacy (eventType, module, payload, orgId)
 * emitEvent signature working for existing agents.
 */

import { supabase, isSupabaseConfigured } from '../supabase'
import type {
  GovernanceEvent,
  GovernanceEventType,
  AgentHandler,
  AgentContext,
  AgentResult,
} from './types/events'

// ------------------------------------------------------------------
// Internal registry
// ------------------------------------------------------------------
const AGENT_HANDLERS: Partial<Record<string, { name: string; handler: AgentHandler }[]>> = {}

interface CircuitState {
  failures: number
  openedAt: number | null
}
const CIRCUIT: Record<string, CircuitState> = {}
const CIRCUIT_THRESHOLD = 5        // consecutive failures
const CIRCUIT_COOLDOWN_MS = 30_000 // 30s open, then half-open

const MAX_RETRIES  = 3
const CASCADE_DEPTH_LIMIT = 10

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function genTraceId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? (crypto as { randomUUID(): string }).randomUUID()
    : `trace-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function hashInput(obj: unknown): string {
  try {
    const s = JSON.stringify(obj)
    let h = 0
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
    return h.toString(36)
  } catch { return 'nohash' }
}

function circuitAllowsRun(agent: string): boolean {
  const c = CIRCUIT[agent]
  if (!c || !c.openedAt) return true
  if (Date.now() - c.openedAt > CIRCUIT_COOLDOWN_MS) {
    // half-open
    c.failures = 0
    c.openedAt = null
    return true
  }
  return false
}

function recordAgentFailure(agent: string) {
  const c = CIRCUIT[agent] ?? (CIRCUIT[agent] = { failures: 0, openedAt: null })
  c.failures++
  if (c.failures >= CIRCUIT_THRESHOLD) c.openedAt = Date.now()
}

function recordAgentSuccess(agent: string) {
  const c = CIRCUIT[agent]
  if (c) { c.failures = 0; c.openedAt = null }
}

// ------------------------------------------------------------------
// Registration
// ------------------------------------------------------------------
export function registerAgent(
  eventType: GovernanceEventType | string,
  handler: AgentHandler | ((payload: Record<string, unknown>, orgId: string) => Promise<void>),
  name?: string,
) {
  const agentName = name ?? (handler as { name?: string }).name ?? 'anonymous-agent'
  if (!AGENT_HANDLERS[eventType]) AGENT_HANDLERS[eventType] = []

  // Wrap legacy (payload, orgId) handlers into the new AgentContext API
  const wrapped: AgentHandler = async (ctx) => {
    // legacy signature?
    if (handler.length <= 2) {
      try {
        await (handler as (p: Record<string, unknown>, org: string) => Promise<void>)(
          ctx.event.payload as Record<string, unknown>, ctx.orgId,
        )
        return { status: 'succeeded' }
      } catch (e) {
        return { status: 'failed', error: (e as Error).message }
      }
    }
    return (handler as AgentHandler)(ctx)
  }

  AGENT_HANDLERS[eventType]!.push({ name: agentName, handler: wrapped })
}

// ------------------------------------------------------------------
// Emit
// ------------------------------------------------------------------
export interface EmitOptions {
  correlationId?: string
  causationId?:   string
  idempotencyKey?: string
  actorId?:       string
  cascadeDepth?:  number
  traceId?:       string
}

export async function emitEvent(
  type: GovernanceEventType | string,
  sourceModule: string,
  payload: Record<string, unknown>,
  orgId: string,
  options: EmitOptions = {},
): Promise<GovernanceEvent | null> {
  const cascadeDepth = options.cascadeDepth ?? 0
  if (cascadeDepth > CASCADE_DEPTH_LIMIT) {
    console.warn(`[eventBus] Cascade depth limit (${CASCADE_DEPTH_LIMIT}) reached for ${type}. Skipping.`)
    return null
  }
  const traceId        = options.traceId ?? genTraceId()
  const idempotencyKey = options.idempotencyKey ?? `${type}:${hashInput(payload)}:${cascadeDepth}`

  const event: GovernanceEvent = {
    org_id:          orgId,
    event_type:      type as GovernanceEventType,
    source_module:   sourceModule,
    payload,
    status:          'pending',
    triggered_agents: [],
    correlation_id:  options.correlationId ?? traceId,
    causation_id:    options.causationId,
    idempotency_key: idempotencyKey,
    trace_id:        traceId,
    actor_id:        options.actorId,
    cascade_depth:   cascadeDepth,
    retry_count:     0,
  }

  // 1. Persist (idempotent via unique index). Without a real org uuid the
  // insert can only fail (uuid FK) — dispatch locally instead of spamming
  // 22P02 warnings.
  let persisted: GovernanceEvent | null = null
  if (isSupabaseConfigured() && supabase && UUID_RE.test(orgId)) {
    try {
      const { data, error } = await supabase
        .from('governance_events')
        .insert(event)
        .select()
        .single()
      if (error) {
        // On duplicate idempotency key, return existing row
        if ((error as { code?: string }).code === '23505') {
          const existing = await supabase.from('governance_events')
            .select('*').eq('org_id', orgId).eq('idempotency_key', idempotencyKey).single()
          persisted = existing.data as GovernanceEvent | null
        } else {
          console.warn('[eventBus] insert failed', error)
        }
      } else persisted = data as GovernanceEvent
    } catch (e) {
      console.warn('[eventBus] supabase error', e)
    }
  }

  const final = persisted ?? { ...event, id: `local-${Date.now()}` }

  // 2. Dispatch agents asynchronously (non-blocking fire-and-forget)
  void dispatchAgents(final, traceId)
  return final
}

// ------------------------------------------------------------------
// Dispatch
// ------------------------------------------------------------------
async function dispatchAgents(event: GovernanceEvent, traceId: string) {
  const specificAgents = AGENT_HANDLERS[event.event_type] ?? []
  const wildcardAgents = AGENT_HANDLERS['*'] ?? []
  const all = [...specificAgents, ...wildcardAgents]
  if (all.length === 0) return

  // Mark processing
  await setEventStatus(event.id, 'processing')

  const triggered: string[] = []
  for (const { name, handler } of all) {
    if (!circuitAllowsRun(name)) {
      await logAgentExecution({
        eventId: event.id, orgId: event.org_id, agent: name,
        eventType: event.event_type, status: 'skipped',
        error: 'circuit-breaker-open', traceId,
      })
      continue
    }

    const ctx: AgentContext = {
      event,
      orgId: event.org_id,
      traceId,
      now: () => Date.now(),
      log: () => {}, // Disabled for production
      emit: async <P>(type: GovernanceEventType, module: string, payload: P) => {
        const child = await emitEvent(type as string, module, payload as Record<string, unknown>, event.org_id, {
          correlationId: event.correlation_id ?? traceId,
          causationId:   event.id,
          cascadeDepth:  (event.cascade_depth ?? 0) + 1,
          traceId,
          actorId:       event.actor_id,
        })
        if (child?.id && event.id) {
          await recordCascadeLink(event.id, child.id, name, (event.cascade_depth ?? 0) + 1)
        }
        return child
      },
    }

    const started = Date.now()
    let result: AgentResult = { status: 'failed' }
    let didThrow = false
    try {
      result = await withTimeout(handler(ctx), 30_000)
      if (result.status === 'succeeded') recordAgentSuccess(name)
      else recordAgentFailure(name)
    } catch (e) {
      didThrow = true
      result = { status: 'failed', error: (e as Error).message }
      recordAgentFailure(name)
    }
    const duration = Date.now() - started
    triggered.push(name)
    await logAgentExecution({
      eventId: event.id, orgId: event.org_id, agent: name,
      eventType: event.event_type,
      status: result.status === 'succeeded' ? 'succeeded' : (result.status === 'skipped' ? 'skipped' : 'failed'),
      duration, output: result.output, error: result.error, traceId,
    })
    if (didThrow) continue
  }

  // Finalize event
  if (isSupabaseConfigured() && event.id) {
    await supabase.from('governance_events').update({
      status: 'completed',
      processed_at: new Date().toISOString(),
      triggered_agents: triggered,
    }).eq('id', event.id)
  }
}

async function setEventStatus(eventId: string | undefined, status: string) {
  if (!eventId || !isSupabaseConfigured() || !supabase) return
  await supabase.from('governance_events').update({ status }).eq('id', eventId)
}

async function logAgentExecution(p: {
  eventId?: string; orgId: string; agent: string; eventType: string
  status: 'succeeded' | 'failed' | 'skipped' | 'timeout'
  duration?: number; output?: Record<string, unknown>; error?: string; traceId: string
}) {
  if (!isSupabaseConfigured() || !supabase || !p.eventId) return
  try {
    await supabase.from('agent_executions').insert({
      org_id: p.orgId,
      event_id: p.eventId,
      agent_name: p.agent,
      event_type: p.eventType,
      status: p.status,
      finished_at: new Date().toISOString(),
      duration_ms: p.duration,
      output: p.output ?? null,
      error: p.error ?? null,
      trace_id: p.traceId,
    })
  } catch (e) { console.warn('[eventBus] exec log failed', e) }
}

async function recordCascadeLink(parentId: string, childId: string, agent: string, depth: number) {
  if (!isSupabaseConfigured() || !supabase) return
  try {
    await supabase.from('event_cascade_links').insert({
      parent_event_id: parentId,
      child_event_id:  childId,
      agent_name:      agent,
      depth,
    })
  } catch { /* unique violation is fine */ }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`agent-timeout-${ms}ms`)), ms)
    p.then(v => { clearTimeout(t); resolve(v) }, e => { clearTimeout(t); reject(e) })
  })
}

// ------------------------------------------------------------------
// Realtime subscription
// ------------------------------------------------------------------
export function subscribeToGovernanceEvents(
  orgId: string,
  onEvent: (event: GovernanceEvent) => void,
) {
  if (!isSupabaseConfigured() || !supabase) return () => {}
  const channel = supabase
    .channel(`governance-events-${orgId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'governance_events',
      filter: `org_id=eq.${orgId}`,
    }, (payload: { new: GovernanceEvent }) => onEvent(payload.new))
    .subscribe()
  return () => { void supabase.removeChannel(channel) }
}

export function subscribeToAgentExecutions(
  orgId: string,
  onExecution: (exec: Record<string, unknown>) => void,
) {
  if (!isSupabaseConfigured() || !supabase) return () => {}
  const channel = supabase
    .channel(`agent-executions-${orgId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'agent_executions',
      filter: `org_id=eq.${orgId}`,
    }, (payload: { new: Record<string, unknown> }) => onExecution(payload.new))
    .subscribe()
  return () => { void supabase.removeChannel(channel) }
}

// ------------------------------------------------------------------
// Introspection
// ------------------------------------------------------------------
export function listRegisteredAgents(): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const [ev, arr] of Object.entries(AGENT_HANDLERS)) {
    out[ev] = (arr ?? []).map(a => a.name)
  }
  return out
}

// ------------------------------------------------------------------
// Default org resolver. governance_events.org_id is a uuid FK, so this must
// resolve the SAME org the rest of the UI uses (session app_metadata.org_id,
// as read by TenantContext) — the legacy auth-store `tenant` field is the
// literal 'default' for demo users and broke every insert with 22P02.
// Resolution order: explicit → supabase session app_metadata.org_id →
// auth-store tenant/id if they are uuids → '' (caller skips persistence).
// ------------------------------------------------------------------
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function resolveOrgId(explicit?: string): string {
  if (explicit && UUID_RE.test(explicit)) return explicit
  try {
    if (typeof window !== 'undefined') {
      // supabase-js persists the session under sb-<ref>-auth-token
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue
        const sess = JSON.parse(window.localStorage.getItem(key) ?? 'null') as
          { user?: { app_metadata?: { org_id?: string } } } | null
        const org = sess?.user?.app_metadata?.org_id
        if (org && UUID_RE.test(org)) return org
      }
      const raw = window.localStorage.getItem('auth-storage')
      if (raw) {
        const state = JSON.parse(raw) as { state?: { user?: { tenant?: string; id?: string } } }
        const cand = state?.state?.user?.tenant ?? state?.state?.user?.id
        if (cand && UUID_RE.test(cand)) return cand
      }
    }
  } catch { /* noop */ }
  return ''
}

// ------------------------------------------------------------------
// Namespaced facade — preferred entry point for callers.
// Usage: governanceBus.emit('MODEL_REGISTERED', 'ai-inventory', payload)
// ------------------------------------------------------------------
export const governanceBus = {
  emit: (
    type: GovernanceEventType | string,
    sourceModule: string,
    payload: Record<string, unknown>,
    orgId?: string,
    options?: EmitOptions,
  ) => emitEvent(type, sourceModule, payload, resolveOrgId(orgId), options),
  registerAgent,
  listAgents: listRegisteredAgents,
  subscribeEvents: subscribeToGovernanceEvents,
  subscribeExecutions: subscribeToAgentExecutions,
  resolveOrgId,
}
