/**
 * ExplainabilityAgent — determines interpretability method + creates a report.
 */
import type { AgentContext, AgentResult, ModelRegisteredPayload } from '../lib/governance/types/events'
import { safeInsert } from '../lib/governance/agentHelpers'

export async function explainabilityAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as ModelRegisteredPayload
  if (!p?.modelId) return { status: 'skipped' }
  const isBlackBox = p.modelType === 'GENERATIVE' || (p.estimatedParams ?? 0) > 1e8
  const method = isBlackBox
    ? (p.modelType === 'GENERATIVE' ? 'attention_maps+counterfactual' : 'SHAP')
    : 'native_coefficients'
  const coverage = isBlackBox ? 'partial' : 'full'
  const report = await safeInsert<{ id: string }>('explainability_reports', {
    org_id: ctx.orgId, model_id: p.modelId, method, coverage,
    interpretability_level: isBlackBox ? 'black_box' : 'white_box',
    requirements: ['local_explanations', 'global_explanations', 'counterfactuals'],
    status: 'PENDING_GENERATION',
  })
  await ctx.emit('EXPLAINABILITY_ASSESSED', 'explainability', {
    modelId: p.modelId, method, coverage, reportId: report?.id,
  })
  ctx.log(`Assigned ${method} (${coverage}) to ${p.modelName}`)
  return { status: 'succeeded', output: { method, coverage, reportId: report?.id } }
}
