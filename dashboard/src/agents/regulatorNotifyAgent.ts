/**
 * RegulatorNotifyAgent — SEC / FCA / ICO (GDPR 72h) / EU AI Act templates.
 */
import type { AgentContext, AgentResult, IncidentCreatedPayload } from '../lib/governance/types/events'
import { regulatorTemplates, safeInsert } from '../lib/governance/agentHelpers'

export async function regulatorNotifyAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as IncidentCreatedPayload
  const jurisdictions = ['US','UK','EU']
  const templates = regulatorTemplates({
    severity: p.severity, dataBreach: p.type === 'DATA_BREACH', jurisdictions,
  })
  const notificationIds: string[] = []
  for (const t of templates) {
    const r = await safeInsert<{ id: string }>('regulator_filings', {
      org_id: ctx.orgId, incident_id: p.incidentId,
      regulator: t.regulator, jurisdiction: t.jurisdiction,
      filing_template: t.template, status: 'DRAFT_AWAITING_APPROVAL',
      deadline_at: new Date(Date.now() + t.deadlineHours * 3600 * 1000).toISOString(),
      drafted_at: new Date().toISOString(),
    })
    if (r?.id) notificationIds.push(r.id)
  }
  await ctx.emit('REGULATOR_NOTIFIED', 'regulator-notify', {
    incidentId: p.incidentId,
    regulators: templates.map(t => t.regulator),
    notificationIds,
  })
  ctx.log(`Drafted ${templates.length} regulator filings`)
  return { status: 'succeeded', output: { count: templates.length } }
}
