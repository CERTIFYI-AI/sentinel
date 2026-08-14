/**
 * DataGovernanceAgent — cross-references datasets for PII/PHI/consent/cross-border.
 */
import type { AgentContext, AgentResult, ModelRegisteredPayload } from '../lib/governance/types/events'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export async function dataGovernanceAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as ModelRegisteredPayload
  const refs = p.trainingDataRefs ?? []
  if (!p?.modelId) return { status: 'skipped' }

  // Link model → datasets on the canonical table: append the model uuid to
  // datasets.used_in_models (the link column the AI Assets pages read).
  let piiFound = false
  let consentOk = true
  const crossBorder: string[] = []
  if (isSupabaseConfigured() && refs.length > 0) {
    const { data } = await supabase.from('datasets')
      .select('id, contains_pii, pii_types, used_in_models')
      .in('id', refs)
    for (const d of data ?? []) {
      if (d.contains_pii || (d.pii_types ?? []).length > 0) piiFound = true
      const linked: string[] = d.used_in_models ?? []
      if (!linked.includes(p.modelId)) {
        const { error } = await supabase.from('datasets')
          .update({ used_in_models: [...linked, p.modelId] })
          .eq('id', d.id)
        if (error) ctx.log(`link ${d.id} → ${p.modelId} failed: ${error.message}`)
      }
    }
  } else if (p.dataSensitivity === 'PII' || p.dataSensitivity === 'PHI') piiFound = true

  // Consent is not tracked on the datasets table — report UNKNOWN rather than
  // asserting validity the platform has not verified.
  await ctx.emit('DATA_GOVERNANCE_CHECK', 'data-governance', {
    modelId: p.modelId, datasets: refs, piiFound, consentStatus: 'UNKNOWN',
    crossBorderJurisdictions: crossBorder,
  })

  if (piiFound) {
    await ctx.emit('RISK_DETECTED', 'data-governance', {
      source: 'DATA_QUALITY', severity: 'HIGH',
      affectedModels: [p.modelId],
      title: `Data governance gap for ${p.modelName}`,
      description: `Model is linked to training data flagged as containing PII; consent status unverified.`,
      detectedAt: new Date().toISOString(),
    })
  }

  ctx.log(`Data gov check pii=${piiFound} consent=${consentOk}`)
  return { status: 'succeeded', output: { piiFound, consentOk, crossBorder } }
}
