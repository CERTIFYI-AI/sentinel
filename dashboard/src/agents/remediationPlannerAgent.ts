/**
 * RemediationPlannerAgent — generates a remediation plan + a tracked task with
 * a severity-tier SLA (4h/24h/7d/30d).
 *
 * 2026-08 re-audit fixes:
 *  - It wrote `due_at` / `sla_hours` / `affected_models` / `runbook_url` —
 *    none of which exist on `remediation_plans` (the real columns are
 *    `due_date` and `linked_model_ids`) — and `due_at` on `tasks` (the real
 *    column is `due_date`). PostgREST rejected both inserts, safeInsert
 *    swallowed the errors, and the agent emitted REMEDIATION_CREATED for rows
 *    that never persisted. The reported writes now go through strictInsert and
 *    the agent returns 'failed' instead of claiming success.
 *  - The task now carries the canonical interlink
 *    (`linked_entity_type: 'risk'` / `linked_entity_id`), so the work item is
 *    reachable from the risk it remediates. P0/P1/P2 priorities are kept —
 *    taskService maps them explicitly.
 */
import type { AgentContext, AgentResult } from '../lib/governance/types/events'
import { safeInsert, strictInsert, severitySla } from '../lib/governance/agentHelpers'

export async function remediationPlannerAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as { riskId?: string; severity?: string; title?: string; affectedModels?: string[]; modelId?: string }
  const severity = (p.severity as 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW') ?? 'MEDIUM'
  const sla = severitySla(severity)
  const dueDate = new Date(Date.now() + sla.hours * 3600 * 1000).toISOString()
  const priority = severity === 'CRITICAL' ? 'P0' : severity === 'HIGH' ? 'P1' : 'P2'

  let plan: { id: string }
  try {
    // Real columns only: due_date (not due_at), linked_model_ids (not
    // affected_models). The SLA tier travels in metadata — there is no
    // sla_hours column to lie about.
    plan = await strictInsert<{ id: string }>('remediation_plans', {
      org_id: ctx.orgId,
      risk_id: p.riskId ?? null,
      source_type: p.riskId ? 'risk' : null,
      source_id: p.riskId ?? null,
      severity,
      priority: severity.toLowerCase(),
      status: 'open',
      due_date: dueDate,
      linked_model_ids: p.affectedModels ?? (p.modelId ? [p.modelId] : []),
      title: `Remediate: ${p.title ?? p.riskId}`,
      metadata: { slaHours: sla.hours, slaLabel: sla.label, plannedBy: 'RemediationPlannerAgent' },
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    ctx.log(`Remediation plan could NOT be persisted for ${p.title ?? p.riskId}: ${error}`)
    return { status: 'failed', error }
  }

  // Checklist items are best-effort: remediation_items exists only on some
  // environments, and a missing checklist must not unwind a persisted plan.
  const items = [
    'Validate containment', 'Root cause analysis', 'Implement permanent fix', 'Post-mortem + evidence',
  ]
  for (let i = 0; i < items.length; i++) {
    await safeInsert('remediation_items', {
      org_id: ctx.orgId, plan_id: plan.id,
      description: items[i], order_index: i + 1, status: 'OPEN',
    })
  }

  try {
    // strictInsert: the emitted REMEDIATION_CREATED event asserts a tracked
    // task exists, so a failed task write fails the agent — it can never emit
    // success for a row that did not persist.
    await strictInsert('tasks', {
      org_id: ctx.orgId,
      title: `Remediation: ${p.title ?? p.riskId}`,
      type: 'REMEDIATION',
      priority,
      status: 'OPEN',
      due_date: dueDate,
      // Canonical interlink — the task is reachable from the risk it remediates.
      linked_entity_type: 'risk',
      linked_entity_id: p.riskId ?? null,
      metadata: { planId: plan.id, riskId: p.riskId },
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    ctx.log(`Remediation task could NOT be persisted for plan ${plan.id}: ${error}`)
    return { status: 'failed', error }
  }

  await ctx.emit('REMEDIATION_CREATED', 'remediation', {
    remediationId: plan.id, riskId: p.riskId, severity, sla: sla.label, dueAt: dueDate,
  })
  ctx.log(`Plan ${plan.id} SLA=${sla.label}`)
  return { status: 'succeeded', output: { planId: plan.id, sla: sla.label } }
}
