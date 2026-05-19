/**
 * FairnessScanAgent
 * Trigger: MODEL_REGISTERED, BIAS_SCAN_QUEUED
 * Action: queues fairness + bias tests across demographic groups.
 */
import type { AgentContext, AgentResult, ModelRegisteredPayload } from '../lib/governance/types/events'
import { safeInsert } from '../lib/governance/agentHelpers'

export async function fairnessScanAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as ModelRegisteredPayload
  if (!p?.modelId) return { status: 'skipped' }

  const protectedAttrs = ['gender', 'race', 'age', 'disability', 'religion', 'sexual_orientation']
  const scan = await safeInsert<{ id: string }>('bias_audits', {
    org_id:           ctx.orgId,
    model_id:         p.modelId,
    model_name:       p.modelName,
    status:           'QUEUED',
    protected_attributes: protectedAttrs,
    fairness_metrics: { demographic_parity: null, equal_opportunity: null, predictive_parity: null },
    scheduled_for:    new Date(Date.now() + 3600 * 1000).toISOString(),
    triggered_by:     'auto-agent',
  })

  await ctx.emit('FAIRNESS_SCAN_QUEUED', 'fairness', {
    modelId: p.modelId, scanId: scan?.id, protectedAttributes: protectedAttrs,
  })
  ctx.log(`Fairness scan ${scan?.id} queued for ${p.modelName}`)
  return { status: 'succeeded', output: { scanId: scan?.id } }
}
