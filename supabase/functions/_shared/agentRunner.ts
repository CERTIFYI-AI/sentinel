// deno-lint-ignore-file no-explicit-any
/**
 * Shared agent runner for Supabase Edge Functions.
 * Executes one event through server-side agents with idempotency,
 * cascade tracking, per-agent execution logging, and DLQ on poisoned events.
 */
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface GovernanceEvent {
  id: string
  org_id: string
  event_type: string
  source_module: string
  payload: Record<string, unknown>
  status: string
  triggered_agents: string[] | null
  retry_count: number | null
  cascade_depth: number | null
  correlation_id: string | null
  causation_id: string | null
  trace_id: string | null
}

export interface AgentContext {
  event: GovernanceEvent
  supabase: SupabaseClient
  log: (msg: string, extra?: Record<string, unknown>) => void
  emit: (type: string, source: string, payload: Record<string, unknown>) => Promise<GovernanceEvent | null>
  now: () => number
}

export interface AgentResult {
  status: 'succeeded' | 'failed' | 'skipped'
  output?: Record<string, unknown>
  error?: string
}

export type AgentHandler = (ctx: AgentContext) => Promise<AgentResult>

const MAX_CASCADE_DEPTH = 10
const AGENT_TIMEOUT_MS = 30_000

export function getSupabase(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  )
}

export async function dispatchEvent(
  event: GovernanceEvent,
  handlers: Record<string, AgentHandler[]>,
  wildcardHandlers: AgentHandler[] = [],
) {
  const sb = getSupabase()
  const list = [...(handlers[event.event_type] ?? []), ...wildcardHandlers]
  if (list.length === 0) {
    await sb.from('governance_events').update({
      status: 'completed', processed_at: new Date().toISOString(), triggered_agents: [],
    }).eq('id', event.id)
    return { triggered: 0 }
  }

  await sb.from('governance_events').update({ status: 'processing' }).eq('id', event.id)

  const triggered: string[] = []
  for (const handler of list) {
    const name = (handler as { name?: string }).name ?? 'anonymous'
    const started = Date.now()
    let result: AgentResult = { status: 'failed' }
    try {
      result = await withTimeout(handler({
        event, supabase: sb,
        log: (m, x) => console.log('[%s] %s', name, m, x ?? {}),
        now: () => Date.now(),
        emit: async (type, source, payload) => {
          if ((event.cascade_depth ?? 0) >= MAX_CASCADE_DEPTH) {
            console.warn(`cascade-depth-limit reached for ${name}`); return null
          }
          const child = await sb.from('governance_events').insert({
            org_id: event.org_id,
            event_type: type,
            source_module: source,
            payload,
            correlation_id: event.correlation_id ?? event.trace_id,
            causation_id: event.id,
            trace_id: event.trace_id,
            cascade_depth: (event.cascade_depth ?? 0) + 1,
            idempotency_key: `${type}:${hash(JSON.stringify(payload))}:${(event.cascade_depth ?? 0) + 1}`,
          }).select().single()
          if (child.data) {
            await sb.from('event_cascade_links').insert({
              parent_event_id: event.id, child_event_id: child.data.id,
              agent_name: name, depth: (event.cascade_depth ?? 0) + 1,
            })
          }
          return child.data as GovernanceEvent | null
        },
      }), AGENT_TIMEOUT_MS)
    } catch (e) {
      result = { status: 'failed', error: (e as Error).message }
    }
    const duration = Date.now() - started
    triggered.push(name)
    await sb.from('agent_executions').insert({
      org_id: event.org_id, event_id: event.id,
      agent_name: name, event_type: event.event_type,
      status: result.status === 'succeeded' ? 'succeeded' : result.status === 'skipped' ? 'skipped' : 'failed',
      finished_at: new Date().toISOString(),
      duration_ms: duration, output: result.output ?? null, error: result.error ?? null,
      trace_id: event.trace_id,
    })
  }

  await sb.from('governance_events').update({
    status: 'completed', processed_at: new Date().toISOString(), triggered_agents: triggered,
  }).eq('id', event.id)
  return { triggered: triggered.length }
}

export async function moveToDLQ(event: GovernanceEvent, error: string, agentName: string) {
  const sb = getSupabase()
  await sb.from('governance_event_dlq').insert({
    org_id: event.org_id,
    original_event: event as any,
    last_error: error, last_agent: agentName,
    attempts: event.retry_count ?? 0,
  })
  await sb.from('governance_events').update({
    status: 'dead_letter', error,
  }).eq('id', event.id)
}

function hash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return h.toString(36)
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`agent-timeout-${ms}ms`)), ms)
    p.then((v) => { clearTimeout(t); resolve(v) }, (e) => { clearTimeout(t); reject(e) })
  })
}
