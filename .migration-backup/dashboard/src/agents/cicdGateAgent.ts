/**
 * CICDGateAgent — registers EU AI Act Conformity Gate workflow instance.
 */
import type { AgentContext, AgentResult, ModelRegisteredPayload } from '../lib/governance/types/events'
import { safeInsert } from '../lib/governance/agentHelpers'

export async function cicdGateAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as ModelRegisteredPayload
  if (!p?.modelId) return { status: 'skipped' }
  const wf = await safeInsert<{ id: string }>('workflow_instances', {
    org_id: ctx.orgId,
    template_code: 'WF-T001',
    name: `EU AI Act Conformity Gate — ${p.modelName}`,
    status: 'ARMED',
    entity_type: 'model', entity_id: p.modelId,
    blocks_deployment: true,
    config: {
      checks: ['risk-register', 'fairness-scan', 'explainability', 'hitl-review', 'dpia', 'carbon-budget'],
      gateType: 'EU_AI_ACT_ART_43',
    },
  })
  await ctx.emit('CICD_GATE_CONFIGURED', 'automation-studio', {
    modelId: p.modelId, workflowIds: [wf?.id], gate: 'WF-T001',
  })
  ctx.log(`CI/CD gate ${wf?.id} armed for ${p.modelName}`)
  return { status: 'succeeded', output: { workflowId: wf?.id } }
}
