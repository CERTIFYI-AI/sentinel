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

  const review = await safeInsert<{ id: string }>('hitl_reviews', {
    org_id:      ctx.orgId,
    entity_type: p.modelId ? 'model' : 'risk',
    entity_id:   (p.modelId as string) ?? (p.riskId as string),
    reason:      p.reason ?? `Auto-escalation from ${ctx.event.event_type}`,
    priority:    p.severity === 'CRITICAL' ? 'P0' : 'P1',
    status:      'OPEN',
    assigned_team: 'compliance',
    blocks_deployment: true,
    created_by:  'HITLAgent',
  })

  await safeInsert('tasks', {
    org_id: ctx.orgId,
    title:  `HITL Review: ${p.modelName ?? p.riskId ?? 'unknown'}`,
    type:   'HITL_REVIEW',
    priority: p.severity === 'CRITICAL' ? 'P0' : 'P1',
    status: 'OPEN',
    due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    metadata: { reviewId: review?.id, modelId: p.modelId },
  })

  await ctx.emit('HITL_REVIEW_REQUIRED', 'hitl', {
    modelId: p.modelId, reviewId: review?.id, blocksDeployment: true,
  })

  ctx.log(`HITL review ${review?.id} created`)
  return { status: 'succeeded', output: { reviewId: review?.id } }
}
