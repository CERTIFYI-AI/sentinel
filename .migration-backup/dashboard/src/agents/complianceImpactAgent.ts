/**
 * ComplianceImpactAgent — recalculates framework scores + trust engine.
 */
import type { AgentContext, AgentResult } from '../lib/governance/types/events'
import { safeInsert } from '../lib/governance/agentHelpers'

export async function complianceImpactAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as { severity?: string; affectedModels?: string[] }
  const delta = p.severity === 'CRITICAL' ? -15 : p.severity === 'HIGH' ? -8 : p.severity === 'MEDIUM' ? -3 : -1
  for (const fw of ['EU_AI_ACT','ISO_42001','SOC_2','NIST_AI_RMF','GDPR']) {
    await safeInsert('compliance_scores', {
      org_id: ctx.orgId, framework: fw, score_delta: delta,
      trust_engine_delta: delta, recalculated_at: new Date().toISOString(),
      caused_by_event_id: ctx.event.id,
      gaps: [`Risk event ${ctx.event.event_type} impacted ${fw}`],
      status: 'RECALCULATED',
    })
  }
  await ctx.emit('COMPLIANCE_UPDATED', 'trust-engine', {
    frameworks: ['EU_AI_ACT','ISO_42001','SOC_2','NIST_AI_RMF','GDPR'],
    newGaps: [], trustScoreDelta: delta,
  })
  ctx.log(`Trust score delta=${delta}`)
  return { status: 'succeeded', output: { delta } }
}
