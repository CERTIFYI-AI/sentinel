/**
 * ConformityAssessmentAgent — EU AI Act Art.43 conformity assessment record.
 */
import type { AgentContext, AgentResult, ModelRegisteredPayload } from '../lib/governance/types/events'
import { classifyEuAiAct, safeInsert } from '../lib/governance/agentHelpers'

export async function conformityAssessmentAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as ModelRegisteredPayload
  if (!p?.modelId) return { status: 'skipped' }
  const cls = p.euAiActClass ?? classifyEuAiAct(p.purpose ?? '', p.deploymentScope ?? 'DEV')
  if (cls !== 'HIGH') return { status: 'skipped', error: 'not-high-risk' }
  const ca = await safeInsert<{ id: string }>('conformity_assessments', {
    org_id: ctx.orgId, model_id: p.modelId,
    framework: 'EU_AI_ACT',
    article: 'Art.43',
    status: 'DRAFT',
    required_artifacts: ['technical_documentation','risk_management_system','quality_management_system','data_governance_plan','human_oversight_plan','accuracy_robustness_evidence','cybersecurity_evidence'],
    notified_body_required: cls === 'HIGH',
    due_at: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
  })
  ctx.log(`Conformity assessment ${ca?.id} created`)
  return { status: 'succeeded', output: { conformityAssessmentId: ca?.id } }
}
