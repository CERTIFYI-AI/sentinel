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

  // Column names must match the real `hitl_reviews` table; tenant_id is filled
  // by the DB default. This record IS the Art. 14 human-oversight path — if the
  // insert fails the escalation never reaches a human, so the result is checked
  // rather than assumed.
  const entityType = p.modelId ? 'model' : 'risk'
  const entityId = (p.modelId as string) ?? (p.riskId as string)

  const review = await safeInsert<{ id: string }>('hitl_reviews', {
    title:         `Review required: ${p.modelName ?? entityId ?? 'unknown entity'}`,
    entity_type:   entityType,
    entity_id:     entityId,
    trigger_reason: (p.reason as string) ?? `Auto-escalation from ${ctx.event.event_type}`,
    priority:      p.severity === 'CRITICAL' ? 'P0' : 'P1',
    status:        'open',
    sla_deadline:  new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    context: {
      eventType: ctx.event.event_type,
      severity: p.severity ?? null,
      blocksDeployment: true,
      createdBy: 'HITLAgent',
    },
  })

  if (!review?.id) {
    // Do not emit HITL_REVIEW_REQUIRED for a review that was never recorded —
    // that would report oversight the platform cannot evidence.
    ctx.log('HITL review insert failed; escalation not recorded')
    return { status: 'failed', error: 'hitl-review-insert-failed' }
  }

  // Mirror the review into the work queue so it carries an owner and an SLA
  // alongside every other governance finding. Columns match the real `tasks`
  // table (see taskService); tenant_id is defaulted DB-side.
  await safeInsert('tasks', {
    title:       `HITL Review: ${p.modelName ?? p.riskId ?? 'unknown'}`,
    description: `Human review required — raised by HITLAgent from ${ctx.event.event_type}.`,
    status:      'todo',
    priority:    p.severity === 'CRITICAL' ? 'critical' : 'high',
    categories:  ['hitl'],
    due_date:    new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    sla_due_at:  new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    auto_generated: true,
    linked_entity_type: entityType,
    linked_entity_id:   entityId,
    linked_items: {
      source: `HITL ${review.id}`,
      sourceType: 'hitl_review',
      sourceLink: '/hitl',
    },
  })

  await ctx.emit('HITL_REVIEW_REQUIRED', 'hitl', {
    modelId: p.modelId, reviewId: review.id, blocksDeployment: true,
  })

  ctx.log(`HITL review ${review.id} created`)
  return { status: 'succeeded', output: { reviewId: review.id } }
}
