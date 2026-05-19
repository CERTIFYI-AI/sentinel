/**
 * IncidentClassificationAgent — classifies P0-P4 severity + assigns commander.
 */
import type { AgentContext, AgentResult, IncidentCreatedPayload } from '../lib/governance/types/events'
import { safeUpdate } from '../lib/governance/agentHelpers'

export async function incidentClassificationAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as IncidentCreatedPayload
  if (!p.incidentId) return { status: 'skipped' }
  let severity: 'P0'|'P1'|'P2'|'P3'|'P4' = p.severity ?? 'P3'
  if (p.type === 'DATA_BREACH' || (p.affectedSubjects ?? 0) > 10_000) severity = 'P0'
  else if (p.type === 'SECURITY' || p.type === 'MODEL_FAILURE') severity = 'P1'
  const commander = severity === 'P0' ? 'ciso' : severity === 'P1' ? 'head-of-risk' : 'incident-manager'
  await safeUpdate('incidents', {
    severity, status: 'OPEN', commander_role: commander,
    classified_at: new Date().toISOString(),
  }, { id: p.incidentId })
  ctx.log(`Incident ${p.incidentId} classified ${severity} → ${commander}`)
  return { status: 'succeeded', output: { severity, commander } }
}
