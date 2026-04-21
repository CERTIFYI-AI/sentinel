/**
 * FinancialImpactAgent — calculates regulatory fine exposure + updates ALE.
 */
import type { AgentContext, AgentResult } from '../lib/governance/types/events'
import { safeInsert } from '../lib/governance/agentHelpers'

export async function financialImpactAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as Record<string, unknown>
  const sev = (p.severity as string) ?? 'MEDIUM'
  // Regulatory fine exposure (worst case)
  const fines: Record<string, number> = {
    EU_AI_ACT: 35_000_000,   // 7% of global revenue or €35m
    GDPR:       20_000_000,  // 4% of global revenue or €20m
    SEC:        10_000_000,
    FCA:         5_000_000,
    ISO_42001:          0,
  }
  const expectedMultiplier = sev === 'P0' ? 0.4 : sev === 'P1' ? 0.2 : 0.05
  const totalExposure = Object.values(fines).reduce((a,b)=>a+b,0) * expectedMultiplier
  const businessInterruption = sev === 'P0' ? 2_000_000 : sev === 'P1' ? 500_000 : 100_000
  const ale = totalExposure + businessInterruption
  await safeInsert('ai_impact_assessments', {
    org_id: ctx.orgId,
    risk_id: p.riskId,
    assessment_type: 'FINANCIAL',
    financial_exposure_usd: ale,
    regulatory_fines: fines,
    business_interruption_usd: businessInterruption,
    annual_loss_expectancy_usd: ale,
    methodology: 'GDPR/EU AI Act worst-case + BCP-aware BI',
    computed_at: new Date().toISOString(),
  })
  if (ale > 10_000_000) {
    await ctx.emit('WORKFLOW_TRIGGERED', 'financial-impact', {
      workflowCode: 'WF-T006', reason: 'CFO alert threshold exceeded',
      threshold: 10_000_000, exposure: ale,
    })
  }
  await ctx.emit('FINANCIAL_IMPACT_CALCULATED', 'financial-impact', {
    incidentId: p.incidentId, totalExposure: ale, aleUpdate: ale,
  })
  ctx.log(`ALE $${ale.toLocaleString()}`)
  return { status: 'succeeded', output: { ale, totalExposure } }
}
