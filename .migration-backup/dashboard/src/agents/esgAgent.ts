/**
 * ESGAgent — recalculates ESG dimension scores from fairness, privacy, carbon events.
 */
import type { AgentContext, AgentResult } from '../lib/governance/types/events'
import { safeInsert } from '../lib/governance/agentHelpers'

export async function esgAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as Record<string, unknown>
  const dimensions: Record<string, number> = {}
  if (ctx.event.event_type === 'CARBON_ESTIMATED')
    dimensions.environmental = Math.max(0, 100 - Math.round((p.annualCO2 as number ?? 0) / 1000))
  if (ctx.event.event_type === 'RISK_DETECTED' && p.source === 'FAIRNESS')
    dimensions.social = 60
  if (ctx.event.event_type === 'RISK_DETECTED' && p.source === 'DATA_QUALITY')
    dimensions.governance = 55
  await safeInsert('esg_reports', {
    org_id: ctx.orgId,
    report_period: new Date().toISOString().slice(0,7),
    dimensions,
    overall_score: Math.round(Object.values(dimensions).reduce((a,b)=>a+b,0) / Math.max(1, Object.keys(dimensions).length)),
    source_event_id: ctx.event.id,
    status: 'DRAFT',
  })
  await ctx.emit('ESG_UPDATED', 'esg', { dimensions })
  return { status: 'succeeded', output: { dimensions } }
}
