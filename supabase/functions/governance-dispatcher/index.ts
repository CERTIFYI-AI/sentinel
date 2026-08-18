// deno-lint-ignore-file no-explicit-any
/**
 * governance-dispatcher (Supabase Edge Function)
 *
 * Webhook invoked by Supabase Database Webhooks when a row is inserted
 * into governance_events. Dispatches server-side agents (those that
 * need service-role writes or external API calls) and writes per-agent
 * executions.
 *
 * Frontend agents still run in the browser for instant UX — this
 * function provides server-authoritative enforcement + reliability.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  dispatchEvent, AgentHandler, AgentContext, AgentResult, GovernanceEvent,
} from '../_shared/agentRunner.ts'

// ---- Server-side agents (lightweight shims that enforce writes) ----
const riskAssessmentAgent: AgentHandler = async (ctx: AgentContext): Promise<AgentResult> => {
  const p = ctx.event.payload as any
  if (!p?.modelId) return { status: 'skipped' }
  // Live risks schema: text id (default), tenant_id text (org uuid — the
  // resolver is NULL under the service role, so set it explicitly), the risk
  // is named in `name` (there is no title/org_id/category/status), severity
  // and likelihood are integers, risk_level is Title Case text. Provenance
  // columns are the platform invariant for agent-generated records. The
  // 2026-08-25 mesh audit found the deployed agents targeting the imagined
  // shape and swallowing the insert error — executions said "succeeded"
  // while zero rows landed.
  const high = p.riskTier <= 2 || p.severity === 'CRITICAL' || p.severity === 'HIGH'
  const { data: risk, error } = await ctx.supabase.from('risks').insert({
    tenant_id: ctx.event.org_id,
    name: `Auto: ${p.modelName ?? p.modelId} — initial AI model risk`,
    description: `Registered model entered the estate; baseline risk record opened by the governance mesh (event ${ctx.event.id}).`,
    categories: ['AI Model Risk'],
    likelihood: high ? 4 : 3,
    severity: high ? 4 : 3,
    risk_level: high ? 'High' : 'Medium',
    mitigation_status: 'Not Started',
    source: 'auto-agent',
    auto_generated: true,
    related_entity_type: 'model',
    related_entity_id: p.modelId,
    source_event_id: ctx.event.id,
  }).select().single()
  if (error) return { status: 'failed', error: `risks insert: ${error.message}` }
  await ctx.emit('RISK_CREATED', 'edge-risk-agent', { riskId: risk?.id, modelId: p.modelId, severity: high ? 'HIGH' : 'MEDIUM' })
  return { status: 'succeeded', output: { riskId: risk?.id } }
}
Object.defineProperty(riskAssessmentAgent, 'name', { value: 'RiskAssessmentAgent' })

const hitlAgent: AgentHandler = async (ctx: AgentContext): Promise<AgentResult> => {
  const p = ctx.event.payload as any
  const highRisk = p.riskTier <= 2 || p.severity === 'CRITICAL' || p.severity === 'HIGH'
  if (!highRisk) return { status: 'skipped' }
  // Live hitl_reviews columns only: tenant_id (no org_id), title,
  // entity_type/entity_id, trigger_reason (no reason/review_type/
  // blocks_deployment/metadata), context jsonb for provenance.
  const { error } = await ctx.supabase.from('hitl_reviews').insert({
    tenant_id: ctx.event.org_id,
    title: `HITL review: ${p.modelName ?? p.modelId ?? ctx.event.event_type}`,
    entity_type: 'model', entity_id: p.modelId,
    trigger_reason: `Auto-escalation from ${ctx.event.event_type} (event ${ctx.event.id})`,
    context: { source: 'auto-agent', auto_generated: true, source_event_id: ctx.event.id, payload: p },
    priority: p.severity === 'CRITICAL' ? 'P0' : 'P1',
    status: 'pending',
  })
  if (error) return { status: 'failed', error: `hitl_reviews insert: ${error.message}` }
  return { status: 'succeeded' }
}
Object.defineProperty(hitlAgent, 'name', { value: 'HITLAgent' })

const notificationAgent: AgentHandler = async (ctx: AgentContext): Promise<AgentResult> => {
  const IMPORTANT = new Set([
    'MODEL_REGISTERED','RISK_DETECTED','INCIDENT_CREATED','CONTAINMENT_EXECUTED',
    'REGULATOR_NOTIFIED','HITL_REVIEW_REQUIRED','CARBON_BUDGET_EXCEEDED',
  ])
  if (!IMPORTANT.has(ctx.event.event_type)) return { status: 'skipped' }
  const p = ctx.event.payload as any
  // Live notifications columns: message (not body/severity), source_module,
  // entity_ref, action_url. `type` is CHECK-constrained to a SEVERITY
  // vocabulary (info/success/warning/error/critical) — not an event name, as
  // the v1 agent assumed. The event name travels in source_module + title.
  const sev = String(p.severity ?? '').toUpperCase()
  const type = sev === 'CRITICAL' ? 'critical' : sev === 'HIGH' ? 'error'
    : sev === 'MEDIUM' ? 'warning' : 'info'
  const { error } = await ctx.supabase.from('notifications').insert({
    org_id: ctx.event.org_id, type,
    source_module: `governance-mesh:${ctx.event.event_type}`,
    title: `${ctx.event.event_type.replace(/_/g,' ')} — ${p.modelName ?? p.title ?? 'auto'}`,
    message: JSON.stringify(p).slice(0, 500),
    entity_ref: p.modelId ?? null,
    action_url: p.modelId ? `/models/inventory/${p.modelId}` : null,
    is_read: false,
  })
  if (error) return { status: 'failed', error: `notifications insert: ${error.message}` }
  return { status: 'succeeded' }
}
Object.defineProperty(notificationAgent, 'name', { value: 'NotificationAgent' })

const HANDLERS: Record<string, AgentHandler[]> = {
  MODEL_REGISTERED: [riskAssessmentAgent, hitlAgent],
  RISK_DETECTED:    [hitlAgent],
}
const WILDCARD: AgentHandler[] = [notificationAgent]

// ---- HTTP handler ----
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  const body = await req.json().catch(() => ({})) as { record?: GovernanceEvent; type?: string }
  // Supabase DB webhook payload: { type: 'INSERT', table, record, schema, old_record }
  const event = body.record
  if (!event?.id) return new Response(JSON.stringify({ error: 'no-record' }), { status: 400 })
  if (event.status !== 'pending') return new Response(JSON.stringify({ skipped: true }))

  try {
    const result = await dispatchEvent(event, HANDLERS, WILDCARD)
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
