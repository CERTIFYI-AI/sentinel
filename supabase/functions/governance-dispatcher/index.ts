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
  const { data: risk } = await ctx.supabase.from('risks').insert({
    org_id: ctx.event.org_id,
    title: `Auto: ${p.modelName ?? p.modelId} — Initial AI Model Risk`,
    category: 'AI Model Risk',
    severity: p.riskTier <= 2 ? 'HIGH' : 'MEDIUM',
    status: 'OPEN', source: 'edge-agent',
    related_entity_type: 'model', related_entity_id: p.modelId,
  }).select().single()
  await ctx.emit('RISK_CREATED', 'edge-risk-agent', { riskId: risk?.id, modelId: p.modelId, severity: p.riskTier <= 2 ? 'HIGH' : 'MEDIUM' })
  return { status: 'succeeded', output: { riskId: risk?.id } }
}
Object.defineProperty(riskAssessmentAgent, 'name', { value: 'RiskAssessmentAgent' })

const hitlAgent: AgentHandler = async (ctx: AgentContext): Promise<AgentResult> => {
  const p = ctx.event.payload as any
  const highRisk = p.riskTier <= 2 || p.severity === 'CRITICAL' || p.severity === 'HIGH'
  if (!highRisk) return { status: 'skipped' }
  // Real columns only; title is NOT NULL and tenant_id drives the org RLS
  // policy (service-role writes bypass RLS but reads by the UI do not).
  const { error } = await ctx.supabase.from('hitl_reviews').insert({
    org_id: ctx.event.org_id, tenant_id: ctx.event.org_id,
    entity_type: 'model', entity_id: p.modelId, model_id: p.modelId ?? null,
    title: `HITL review: ${p.modelName ?? p.modelId ?? ctx.event.event_type}`,
    reason: `Auto-escalation from ${ctx.event.event_type}`,
    trigger_reason: `Auto-escalation from ${ctx.event.event_type}`,
    review_type: 'escalation',
    priority: p.severity === 'CRITICAL' ? 'critical' : 'high',
    status: 'pending', blocks_deployment: true,
    metadata: { created_by: 'EdgeHITLAgent' },
  })
  if (error) return { status: 'failed', error: error.message }
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
  // Canonical `notifications` columns (see
  // 20260828000001_notifications_schema_convergence.sql). This previously wrote
  // `type`/`body` plus a `severity` column that has never existed in any era of
  // this table — and did not check the result, so every notification it
  // produced was discarded in silence. Severity now rides in the message.
  const { error } = await ctx.supabase.from('notifications').insert({
    org_id: ctx.event.org_id,
    tenant_id: ctx.event.org_id,
    notification_type: ctx.event.event_type,
    title: `${ctx.event.event_type.replace(/_/g,' ')} — ${p.modelName ?? p.title ?? 'auto'}`,
    message: JSON.stringify({ severity: p.severity ?? 'INFO', ...p }).slice(0, 500),
    entity_type: p.incidentId ? 'incident' : p.modelId ? 'model' : 'event',
    entity_id: (p.incidentId as string) ?? (p.modelId as string) ?? null,
    is_read: false,
  })
  // Fail loudly: a dropped governance notification is a missed escalation.
  if (error) return { status: 'failed', error: error.message }
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
