/**
 * VendorCascadeAgent — vendor SLA breach + BCP-004 failover.
 *
 * With incidents now carrying vendor_id / vendor_sla_id (20260824000001), a
 * cascade fired for an incident also writes the vendor attribution onto the
 * incident row itself and links the incident back onto the breached SLA — so
 * the breach is reachable from both directions (First principle #1), not just
 * asserted in an event payload.
 */
import type { AgentContext, AgentResult } from '../lib/governance/types/events'
import { safeUpdate, safeInsert } from '../lib/governance/agentHelpers'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export async function vendorCascadeAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as { incidentId?: string; vendorId?: string; vendorSlaId?: string; vendor?: string }
  // Matching by name is an id-space violation and mis-targets renamed vendors.
  if (!p.vendorId) return { status: 'skipped', error: 'no-vendor-id' }
  // Re-audit (2026-08-17): this previously also wrote `risk_score: 85` — an
  // invented literal stamped onto a governed vendor record on every cascade.
  // A breach is a fact worth recording; a score nobody computed is not.
  await safeUpdate('vendors', {
    sla_breach_flag: true,
    last_breach_at: new Date().toISOString(),
  }, { org_id: ctx.orgId, id: p.vendorId })

  // Attribute the vendor (and the breached SLA, when the payload names one)
  // on the incident row itself — the incident record must be able to name its
  // vendor without replaying the event stream.
  if (p.incidentId) {
    const incidentPatch: Record<string, unknown> = { vendor_id: p.vendorId }
    if (p.vendorSlaId) incidentPatch.vendor_sla_id = p.vendorSlaId
    await safeUpdate('incidents', incidentPatch, { org_id: ctx.orgId, id: p.incidentId })

    // Reverse link: append this incident to the matched SLA's
    // linked_incident_ids. Read-modify-write is acceptable here — the agent is
    // the only writer of this column and cascades for one SLA are serialised
    // by the mesh; a concurrent writer could still lose an append (no
    // compare-and-set), which is accepted and would only drop a convenience
    // backlink, never the canonical incidents.vendor_sla_id attribution.
    if (p.vendorSlaId && isSupabaseConfigured() && supabase) {
      try {
        const { data: slaRow, error } = await supabase
          .from('vendor_slas')
          .select('id, linked_incident_ids')
          .eq('org_id', ctx.orgId)
          .eq('id', p.vendorSlaId)
          .maybeSingle()
        if (!error && slaRow) {
          const existing: string[] = Array.isArray(slaRow.linked_incident_ids) ? slaRow.linked_incident_ids : []
          if (!existing.includes(p.incidentId)) {
            await safeUpdate('vendor_slas', {
              linked_incident_ids: [...existing, p.incidentId],
              last_breach_at: new Date().toISOString(),
            }, { org_id: ctx.orgId, id: p.vendorSlaId })
          }
        }
      } catch (e) {
        ctx.log(`SLA backlink append failed (non-fatal): ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  await safeUpdate('bcp_plans', {
    status: 'ACTIVATED',
    activated_by_incident: p.incidentId,
    activated_at: new Date().toISOString(),
  }, { org_id: ctx.orgId, plan_code: 'BCP-004' })
  await safeInsert('tasks', {
    org_id: ctx.orgId,
    title: `Notify vendor ${p.vendor ?? p.vendorId} of SLA breach`,
    type: 'VENDOR_NOTIFICATION', priority: 'P1',
    status: 'OPEN', due_date: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    linked_entity_type: 'incident',
    linked_entity_id: p.incidentId ?? null,
  })
  await ctx.emit('VENDOR_NOTIFIED', 'vendor-registry', {
    incidentId: p.incidentId, vendorId: p.vendorId, vendorSlaId: p.vendorSlaId ?? null, slaBreached: true,
  })
  ctx.log(`Vendor ${p.vendor ?? p.vendorId} cascade triggered`)
  return { status: 'succeeded' }
}
