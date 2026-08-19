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
  // LIVE risks schema (verified against the project, not inferred): text id
  // (default), tenant_id text (org uuid — the resolver is NULL under the
  // service role, so set it explicitly), the risk is named in `name` (there is
  // NO title/org_id/category/status), severity and likelihood are integers,
  // risk_level is Title Case text. Provenance columns are the platform
  // invariant for agent-generated records. The 2026-08-25 mesh audit found the
  // deployed agents targeting the imagined title/category/status shape and
  // swallowing the insert error — executions said "succeeded" while zero rows
  // landed. Errors are now returned as `failed` with the database's message.
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
    source: 'auto-agent', auto_generated: true,
    related_entity_type: 'model', related_entity_id: p.modelId,
    source_event_id: ctx.event.id,
  }).select().single()
  if (error) return { status: 'failed', error: 'risks insert failed' }
  await ctx.emit('RISK_CREATED', 'edge-risk-agent', { riskId: risk?.id, modelId: p.modelId, severity: high ? 'HIGH' : 'MEDIUM' })
  return { status: 'succeeded', output: { riskId: risk?.id } }
}
Object.defineProperty(riskAssessmentAgent, 'name', { value: 'RiskAssessmentAgent' })

const hitlAgent: AgentHandler = async (ctx: AgentContext): Promise<AgentResult> => {
  const p = ctx.event.payload as any
  const highRisk = p.riskTier <= 2 || p.severity === 'CRITICAL' || p.severity === 'HIGH'
  if (!highRisk) return { status: 'skipped' }
  // LIVE hitl_reviews columns only (verified): tenant_id (NO org_id), title,
  // entity_type/entity_id, trigger_reason (NO reason/review_type/
  // blocks_deployment/metadata/model_id), context jsonb for provenance. tenant_id
  // drives the org RLS policy the UI reads under.
  const { error } = await ctx.supabase.from('hitl_reviews').insert({
    tenant_id: ctx.event.org_id,
    title: `HITL review: ${p.modelName ?? p.modelId ?? ctx.event.event_type}`,
    entity_type: 'model', entity_id: p.modelId,
    trigger_reason: `Auto-escalation from ${ctx.event.event_type} (event ${ctx.event.id})`,
    context: { source: 'auto-agent', auto_generated: true, source_event_id: ctx.event.id, payload: p },
    priority: p.severity === 'CRITICAL' ? 'P0' : 'P1',
    status: 'pending',
  })
  if (error) return { status: 'failed', error: 'hitl_reviews insert failed' }
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
  // Canonical `notifications` columns after the schema convergence
  // (20260828000001): the reader selects notification_type/entity_type/
  // entity_id/url_path. `type` defaults to 'info' (its CHECK vocabulary), so
  // omitting it is safe. Severity rides in the message body. url_path drives the
  // drawer's deep link to the governed record.
  const { error } = await ctx.supabase.from('notifications').insert({
    org_id: ctx.event.org_id,
    tenant_id: ctx.event.org_id,
    notification_type: ctx.event.event_type,
    title: `${ctx.event.event_type.replace(/_/g,' ')} — ${p.modelName ?? p.title ?? 'auto'}`,
    message: JSON.stringify({ severity: p.severity ?? 'INFO', ...p }).slice(0, 500),
    entity_type: p.incidentId ? 'incident' : p.modelId ? 'model' : 'event',
    entity_id: (p.incidentId as string) ?? (p.modelId as string) ?? null,
    url_path: p.modelId ? `/models/inventory/${p.modelId}` : p.incidentId ? `/risk/incidents?open=${p.incidentId}` : null,
    is_read: false,
  })
  // Fail loudly: a dropped governance notification is a missed escalation.
  if (error) return { status: 'failed', error: 'notifications insert failed' }
  return { status: 'succeeded' }
}
Object.defineProperty(notificationAgent, 'name', { value: 'NotificationAgent' })

const HANDLERS: Record<string, AgentHandler[]> = {
  MODEL_REGISTERED: [riskAssessmentAgent, hitlAgent],
  RISK_DETECTED:    [hitlAgent],
}
const WILDCARD: AgentHandler[] = [notificationAgent]

// ---- Auth ----
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// ---- HTTP handler ----
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const secret = req.headers.get('x-cron-secret') ?? ''
  if (!CRON_SECRET || !timingSafeEqual(secret, CRON_SECRET)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    })
  }

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
    return new Response(JSON.stringify({ ok: false, error: 'dispatch_failed' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
