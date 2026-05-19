/**
 * ComplianceMapAgent
 * Trigger: MODEL_REGISTERED, COMPLIANCE_UPDATED
 * Action:  Classifies EU AI Act tier, creates control-map entries for
 *          ISO 42001, SOC 2, NIST AI RMF, emits COMPLIANCE_MAPPED.
 */
import type { AgentContext, AgentResult, ModelRegisteredPayload } from '../lib/governance/types/events'
import { classifyEuAiAct, safeInsert } from '../lib/governance/agentHelpers'

const ACTIVE_FRAMEWORKS = ['EU_AI_ACT', 'ISO_42001', 'SOC_2', 'NIST_AI_RMF']

export async function complianceMapAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as ModelRegisteredPayload
  if (!p?.modelId) return { status: 'skipped', error: 'no-modelId' }

  const euClass = p.euAiActClass ?? classifyEuAiAct(p.purpose ?? '', p.deploymentScope ?? 'DEV')
  const gaps: string[] = []

  if (euClass === 'UNACCEPTABLE') gaps.push('EU AI Act Art.5 — model purpose is prohibited')
  if (euClass === 'HIGH') {
    gaps.push('EU AI Act Art.9 — Risk Management System required')
    gaps.push('EU AI Act Art.10 — Data and data governance requirements')
    gaps.push('EU AI Act Art.11 — Technical documentation')
    gaps.push('EU AI Act Art.13 — Transparency and information to users')
    gaps.push('EU AI Act Art.14 — Human oversight')
    gaps.push('EU AI Act Art.15 — Accuracy, robustness, cybersecurity')
    gaps.push('EU AI Act Art.17 — Quality management system')
    gaps.push('EU AI Act Art.43 — Conformity assessment')
  }
  if (p.dataSensitivity === 'PII' || p.dataSensitivity === 'PHI') {
    gaps.push('GDPR Art.35 — DPIA required')
  }
  gaps.push('ISO/IEC 42001 — AI Management System control mapping')
  gaps.push('NIST AI RMF — Map / Measure / Manage / Govern lifecycle stages')
  if (p.deploymentScope === 'PROD') gaps.push('SOC 2 CC7.2 — continuous monitoring of AI pipeline')

  // persist a compliance score update record
  await safeInsert('compliance_scores', {
    org_id:     ctx.orgId,
    framework:  'EU_AI_ACT',
    model_id:   p.modelId,
    score:      euClass === 'HIGH' || euClass === 'UNACCEPTABLE' ? 35 : 72,
    gaps,
    status:     gaps.length > 0 ? 'GAP_IDENTIFIED' : 'COMPLIANT',
    assessed_at: new Date().toISOString(),
  })

  await ctx.emit('COMPLIANCE_MAPPED', 'frameworks', {
    modelId:    p.modelId,
    frameworks: ACTIVE_FRAMEWORKS,
    euAiActClass: euClass,
    gaps,
  })

  if (euClass === 'HIGH' || euClass === 'UNACCEPTABLE') {
    await ctx.emit('HITL_REVIEW_REQUIRED', 'frameworks', {
      modelId: p.modelId, reason: `EU AI Act ${euClass}`, severity: 'HIGH',
    })
  }

  ctx.log(`Mapped ${p.modelName} → EU ${euClass}, ${gaps.length} gaps`)
  return { status: 'succeeded', output: { euAiActClass: euClass, gapCount: gaps.length } }
}
