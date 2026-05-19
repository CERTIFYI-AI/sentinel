/**
 * ContainmentAgent — P0/P1: pause models + BCP failover + block CI/CD + preserve evidence.
 */
import type { AgentContext, AgentResult, IncidentCreatedPayload } from '../lib/governance/types/events'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { safeInsert, safeUpdate } from '../lib/governance/agentHelpers'

export async function containmentAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as IncidentCreatedPayload
  if (p.severity !== 'P0' && p.severity !== 'P1') return { status: 'skipped' }
  // pause affected models
  if (isSupabaseConfigured() && p.affectedModels?.length) {
    await supabase.from('ai_models').update({
      status: 'PAUSED',
      paused_reason: `Incident ${p.incidentId} (${p.severity})`,
      paused_at: new Date().toISOString(),
    }).in('id', p.affectedModels).eq('org_id', ctx.orgId)
  }
  // trigger BCP failover
  await safeUpdate('bcp_plans', {
    status: 'ACTIVATED',
    activated_by_incident: p.incidentId,
    activated_at: new Date().toISOString(),
  }, { org_id: ctx.orgId, plan_code: 'BCP-001' })
  // block all CI/CD
  await safeInsert('workflow_instances', {
    org_id: ctx.orgId, template_code: 'WF-T002',
    name: `PLATFORM CI/CD BLOCK — incident ${p.incidentId}`,
    status: 'RUNNING', entity_type: 'incident', entity_id: p.incidentId,
    config: { blockAllDeployments: true },
  })
  // preserve evidence snapshot
  await safeInsert('evidence', {
    org_id: ctx.orgId, incident_id: p.incidentId,
    evidence_type: 'SNAPSHOT',
    captured_at: new Date().toISOString(),
    description: `Containment snapshot for ${p.incidentId}: logs, model state, data state`,
    hash: null,  // EvidenceCollectionAgent will compute chain hash
  })
  await ctx.emit('CONTAINMENT_EXECUTED', 'incidents', {
    incidentId: p.incidentId, modelsPaused: p.affectedModels, bcpActivated: 'BCP-001',
  })
  ctx.log(`Containment executed for ${p.incidentId}`)
  return { status: 'succeeded', output: { bcp: 'BCP-001' } }
}
