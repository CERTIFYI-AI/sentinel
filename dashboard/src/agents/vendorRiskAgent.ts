/**
 * VendorRiskAgent — links a model to its vendor and records concentration risk.
 *
 * Re-audit (2026-08-17) found this agent broken three ways, all silent:
 *   1. It counted models with `.eq('vendor', …)`, but `ai_models` has no
 *      `vendor` column (it has `provider`). PostgREST returned 42703, the error
 *      was never inspected, and `concentration` was therefore ALWAYS 0.
 *   2. It wrote the string 'CONCENTRATION_BREACH' into `vendors.risk_flag`,
 *      which is boolean — a 22P02 that rejected the whole UPDATE, taking
 *      `concentration_risk` and `last_assessed_at` down with it.
 *   3. `safeUpdate` swallowed that error and the agent still returned
 *      `succeeded` and emitted VENDOR_LINKED with a figure that was never
 *      stored — fake success in a governance agent.
 *
 * Concentration is now computed from `vendors.linked_models` (the column that
 * actually records model↔vendor attribution) and the write goes through
 * `strictUpdate`, so the agent cannot report a number it failed to persist.
 */
import type { AgentContext, AgentResult, ModelRegisteredPayload } from '../lib/governance/types/events'
import { strictUpdate } from '../lib/governance/agentHelpers'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/** Concentration threshold above which the estate is judged over-dependent. */
const CONCENTRATION_THRESHOLD = 0.4

export async function vendorRiskAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as ModelRegisteredPayload
  // Matching a vendor by name is an id-space violation and silently mis-targets
  // renamed vendors; require the uuid.
  if (!p?.vendorId) return { status: 'skipped', error: 'no-vendor-id' }
  if (!isSupabaseConfigured()) return { status: 'skipped', error: 'supabase-not-configured' }

  const { data: vendorRow, error: vendorErr } = await supabase
    .from('vendors').select('id,name,linked_models').eq('org_id', ctx.orgId).eq('id', p.vendorId).single()
  if (vendorErr) return { status: 'failed', error: `vendor lookup: ${vendorErr.message}` }

  const { count: totalModelCount, error: countErr } = await supabase
    .from('ai_models').select('*', { count: 'exact', head: true }).eq('org_id', ctx.orgId)
  if (countErr) return { status: 'failed', error: `model count: ${countErr.message}` }

  // linked_models is jsonb on the live table and text[] on others; both shapes
  // arrive as an array here. Include the model being registered.
  const linked = Array.isArray(vendorRow?.linked_models) ? (vendorRow!.linked_models as unknown[]).map(String) : []
  const next = linked.includes(p.modelId) ? linked : [...linked, p.modelId]

  // No models means no denominator — report unknown rather than 0, which would
  // read as "no concentration" when it means "nothing measured".
  const concentration = totalModelCount && totalModelCount > 0 ? next.length / totalModelCount : null
  const flagged = concentration != null && concentration > CONCENTRATION_THRESHOLD

  try {
    await strictUpdate('vendors', {
      linked_models: next,
      concentration_risk: concentration,
      risk_flag: flagged,
      risk_flag_reason: flagged ? 'CONCENTRATION_BREACH' : null,
      last_assessed_at: new Date().toISOString(),
    }, { org_id: ctx.orgId, id: p.vendorId })
  } catch (e) {
    // Never emit a concentration figure that did not persist.
    return { status: 'failed', error: e instanceof Error ? e.message : String(e) }
  }

  await ctx.emit('VENDOR_LINKED', 'vendor-registry', {
    modelId: p.modelId, vendorId: p.vendorId, vendor: vendorRow?.name ?? p.vendor,
    concentrationRisk: concentration, flagged,
  })
  if (flagged && concentration != null) {
    await ctx.emit('RISK_DETECTED', 'vendor-registry', {
      source: 'VENDOR_SLA', severity: 'HIGH',
      affectedModels: [p.modelId],
      title: `Vendor concentration risk >${CONCENTRATION_THRESHOLD * 100}% for ${vendorRow?.name ?? 'vendor'}`,
      description: `${Math.round(concentration * 100)}% of registered models depend on ${vendorRow?.name ?? 'this vendor'}`,
      detectedAt: new Date().toISOString(),
    })
  }
  ctx.log(`Vendor ${vendorRow?.name ?? p.vendorId} concentration=${
    concentration == null ? 'unknown' : `${(concentration * 100).toFixed(1)}%`}`)
  return { status: 'succeeded', output: { concentration, flagged } }
}
