/**
 * CarbonAgent — estimates training + inference CO2 footprint.
 */
import type { AgentContext, AgentResult, ModelRegisteredPayload } from '../lib/governance/types/events'
import { estimateCarbon, safeInsert } from '../lib/governance/agentHelpers'

export async function carbonAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as ModelRegisteredPayload
  if (!p?.modelId) return { status: 'skipped' }
  const c = estimateCarbon(p)
  await safeInsert('carbon_records', {
    org_id: ctx.orgId, model_id: p.modelId,
    training_co2_kg: c.trainingCO2Kg,
    inference_co2_kg_per_day: c.inferenceCO2KgPerDay,
    annual_co2_kg: c.annualCO2Kg,
    methodology: 'ML-CO2-Impact heuristic + serving uplift',
    assessed_at: new Date().toISOString(),
  })
  await ctx.emit('CARBON_ESTIMATED', 'carbon-ledger', {
    modelId: p.modelId, trainingCO2: c.trainingCO2Kg, inferenceCO2: c.inferenceCO2KgPerDay, annualCO2: c.annualCO2Kg,
  })
  if (c.annualCO2Kg > 50_000) {
    await ctx.emit('CARBON_BUDGET_EXCEEDED', 'carbon-ledger', {
      modelId: p.modelId, annualCO2: c.annualCO2Kg, budget: 50000,
    })
  }
  ctx.log(`Carbon ${c.annualCO2Kg.toFixed(0)} kgCO2/yr for ${p.modelName}`)
  return { status: 'succeeded', output: c }
}
