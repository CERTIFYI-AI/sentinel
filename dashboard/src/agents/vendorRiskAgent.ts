/**
 * VendorRiskAgent — links model to vendor + updates concentration risk.
 */
import type { AgentContext, AgentResult, ModelRegisteredPayload } from '../lib/governance/types/events'
import { safeUpdate } from '../lib/governance/agentHelpers'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export async function vendorRiskAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as ModelRegisteredPayload
  if (!p?.vendor && !p?.vendorId) return { status: 'skipped', error: 'no-vendor' }

  // Concentration-risk calc
  let concentration = 0
  if (isSupabaseConfigured()) {
    const [{ count: vendorModelCount }, { count: totalModelCount }] = await Promise.all([
      supabase.from('ai_models').select('*', { count: 'exact', head: true }).eq('org_id', ctx.orgId).eq('vendor', p.vendor ?? ''),
      supabase.from('ai_models').select('*', { count: 'exact', head: true }).eq('org_id', ctx.orgId),
    ])
    concentration = totalModelCount && vendorModelCount ? vendorModelCount / totalModelCount : 0
  }
  const flagged = concentration > 0.4

  await safeUpdate('vendors', {
    concentration_risk: concentration,
    risk_flag: flagged ? 'CONCENTRATION_BREACH' : 'NOMINAL',
    last_assessed_at: new Date().toISOString(),
  }, { org_id: ctx.orgId, ...(p.vendorId ? { id: p.vendorId } : { name: p.vendor }) })

  await ctx.emit('VENDOR_LINKED', 'vendor-registry', {
    modelId: p.modelId, vendorId: p.vendorId, vendor: p.vendor,
    concentrationRisk: concentration, flagged,
  })
  if (flagged) {
    await ctx.emit('RISK_DETECTED', 'vendor-registry', {
      source: 'VENDOR_SLA', severity: 'HIGH',
      affectedModels: [p.modelId],
      title: `Vendor concentration risk >40% for ${p.vendor}`,
      description: `${Math.round(concentration * 100)}% of models depend on ${p.vendor}`,
      detectedAt: new Date().toISOString(),
    })
  }
  ctx.log(`Vendor ${p.vendor} concentration=${(concentration * 100).toFixed(1)}%`)
  return { status: 'succeeded', output: { concentration, flagged } }
}
