/**
 * RemediationPlannerAgent — generates remediation plan + tasks with SLA.
 */
import type { AgentContext, AgentResult } from '../lib/governance/types/events'
import { safeInsert, severitySla } from '../lib/governance/agentHelpers'

export async function remediationPlannerAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as { riskId?: string; severity?: string; title?: string; affectedModels?: string[]; modelId?: string }
  const severity = (p.severity as 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW') ?? 'MEDIUM'
  const sla = severitySla(severity)
  const dueAt = new Date(Date.now() + sla.hours * 3600 * 1000).toISOString()

  const plan = await safeInsert<{ id: string }>('remediation_plans', {
    org_id: ctx.orgId,
    risk_id: p.riskId,
    severity,
    status: 'OPEN',
    due_at: dueAt,
    sla_hours: sla.hours,
    affected_models: p.affectedModels ?? (p.modelId ? [p.modelId] : []),
    title: `Remediate: ${p.title ?? p.riskId}`,
    runbook_url: null,
  })
  await safeInsert('remediation_items', {
    org_id: ctx.orgId, plan_id: plan?.id,
    description: 'Validate containment',    order_index: 1, status: 'OPEN',
  })
  await safeInsert('remediation_items', {
    org_id: ctx.orgId, plan_id: plan?.id,
    description: 'Root cause analysis',     order_index: 2, status: 'OPEN',
  })
  await safeInsert('remediation_items', {
    org_id: ctx.orgId, plan_id: plan?.id,
    description: 'Implement permanent fix', order_index: 3, status: 'OPEN',
  })
  await safeInsert('remediation_items', {
    org_id: ctx.orgId, plan_id: plan?.id,
    description: 'Post-mortem + evidence',  order_index: 4, status: 'OPEN',
  })
  await safeInsert('tasks', {
    org_id: ctx.orgId, title: `Remediation: ${p.title ?? p.riskId}`,
    type: 'REMEDIATION', priority: severity === 'CRITICAL' ? 'P0' : severity === 'HIGH' ? 'P1' : 'P2',
    status: 'OPEN', due_at: dueAt, metadata: { planId: plan?.id, riskId: p.riskId },
  })
  await ctx.emit('REMEDIATION_CREATED', 'remediation', {
    remediationId: plan?.id, riskId: p.riskId, severity, sla: sla.label, dueAt,
  })
  ctx.log(`Plan ${plan?.id} SLA=${sla.label}`)
  return { status: 'succeeded', output: { planId: plan?.id, sla: sla.label } }
}
