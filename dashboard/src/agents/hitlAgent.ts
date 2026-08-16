/**
 * HITLAgent — creates Human-In-The-Loop review tasks.
 */
import type { AgentContext, AgentResult } from '../lib/governance/types/events'
import { safeInsert } from '../lib/governance/agentHelpers'

export async function hitlAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as Record<string, unknown>
  const isHighRisk =
    (p.riskTier as number) <= 2 ||
    p.severity === 'CRITICAL' || p.severity === 'HIGH' ||
    p.euAiActClass === 'HIGH' || p.euAiActClass === 'UNACCEPTABLE' ||
    ctx.event.event_type === 'HITL_REVIEW_REQUIRED'
  if (!isHighRisk) return { status: 'skipped', error: 'not-high-risk' }

  // Real hitl_reviews columns only (title is NOT NULL; tenant_id drives the
  // org RLS policy, so it must follow org_id explicitly here — the DB default
  // resolves per-session and agents can run outside a user session).
  const reason = (p.reason as string) ?? `Auto-escalation from ${ctx.event.event_type}`
  const review = await safeInsert<{ id: string }>('hitl_reviews', {
    org_id:      ctx.orgId,
    tenant_id:   ctx.orgId,
    entity_type: p.modelId ? 'model' : 'risk',
    entity_id:   (p.modelId as string) ?? (p.riskId as string),
    entity_name: (p.modelName as string) ?? (p.riskId as string) ?? null,
    model_id:    (p.modelId as string) ?? null,
    title:       `HITL review: ${p.modelName ?? p.riskId ?? ctx.event.event_type}`,
    reason,
    trigger_reason: reason,
    review_type: 'escalation',
    priority:    p.severity === 'CRITICAL' ? 'critical' : 'high',
    risk_level:  p.severity === 'CRITICAL' ? 'critical' : 'high',
    status:      'pending',
    blocks_deployment: true,
    metadata:    { created_by: 'HITLAgent', event_type: ctx.event.event_type },
  })

  // tasks has due_date (not due_at) and linked_entity_* (not metadata).
  await safeInsert('tasks', {
    org_id: ctx.orgId,
    title:  `HITL Review: ${p.modelName ?? p.riskId ?? 'unknown'}`,
    type:   'HITL_REVIEW',
    priority: p.severity === 'CRITICAL' ? 'P0' : 'P1',
    status: 'OPEN',
    due_date: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    linked_entity_type: 'hitl_review',
    linked_entity_id: review?.id ?? null,
  })

  await ctx.emit('HITL_REVIEW_REQUIRED', 'hitl', {
    modelId: p.modelId, reviewId: review?.id, blocksDeployment: true,
  })

  ctx.log(`HITL review ${review?.id} created`)
  return { status: 'succeeded', output: { reviewId: review?.id } }
}
