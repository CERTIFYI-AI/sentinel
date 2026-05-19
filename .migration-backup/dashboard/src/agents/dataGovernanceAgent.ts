/**
 * DataGovernanceAgent — cross-references datasets for PII/PHI/consent/cross-border.
 */
import type { AgentContext, AgentResult, ModelRegisteredPayload } from '../lib/governance/types/events'
import { safeInsert } from '../lib/governance/agentHelpers'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export async function dataGovernanceAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as ModelRegisteredPayload
  const refs = p.trainingDataRefs ?? []
  if (!p?.modelId) return { status: 'skipped' }

  // Link model → datasets
  for (const datasetId of refs) {
    await safeInsert('model_dataset_links', {
      org_id: ctx.orgId, model_id: p.modelId, dataset_id: datasetId, link_type: 'training',
    })
  }

  // Check consent status + PII flags
  let piiFound = false
  let consentOk = true
  let crossBorder: string[] = []
  if (isSupabaseConfigured() && refs.length > 0) {
    const { data } = await supabase.from('dataset_registry').select('*').in('id', refs)
    for (const d of data ?? []) {
      if (d.contains_pii || d.contains_phi) piiFound = true
      if (d.consent_status && d.consent_status !== 'VALID') consentOk = false
      if (d.jurisdiction && d.jurisdiction !== 'EU') crossBorder.push(d.jurisdiction)
    }
  } else if (p.dataSensitivity === 'PII' || p.dataSensitivity === 'PHI') piiFound = true

  await ctx.emit('DATA_GOVERNANCE_CHECK', 'data-governance', {
    modelId: p.modelId, datasets: refs, piiFound, consentStatus: consentOk ? 'VALID' : 'MISSING',
    crossBorderJurisdictions: crossBorder,
  })

  if (!consentOk || piiFound) {
    await ctx.emit('RISK_DETECTED', 'data-governance', {
      source: 'DATA_QUALITY', severity: piiFound ? 'HIGH' : 'MEDIUM',
      affectedModels: [p.modelId],
      title: `Data governance gap for ${p.modelName}`,
      description: `PII=${piiFound}, consent=${consentOk}, cross-border=${crossBorder.join(',')}`,
      detectedAt: new Date().toISOString(),
    })
  }

  ctx.log(`Data gov check pii=${piiFound} consent=${consentOk}`)
  return { status: 'succeeded', output: { piiFound, consentOk, crossBorder } }
}
