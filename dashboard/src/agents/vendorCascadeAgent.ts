/**
 * VendorCascadeAgent — vendor SLA breach + BCP-004 failover.
 */
import type { AgentContext, AgentResult } from '../lib/governance/types/events'
import { safeUpdate, safeInsert } from '../lib/governance/agentHelpers'

export async function vendorCascadeAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as { incidentId?: string; vendorId?: string; vendor?: string }
  if (!p.vendorId && !p.vendor) return { status: 'skipped' }
  await safeUpdate('vendors', {
    sla_breach_flag: true,
    last_breach_at: new Date().toISOString(),
    risk_score: 85,
  }, { org_id: ctx.orgId, ...(p.vendorId ? { id: p.vendorId } : { name: p.vendor }) })
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
    incidentId: p.incidentId, vendorId: p.vendorId, slaBreached: true,
  })
  ctx.log(`Vendor ${p.vendor} cascade triggered`)
  return { status: 'succeeded' }
}
