/**
 * RegulatorNotifyAgent — SEC / FCA / ICO (GDPR 72h) / EU AI Act templates.
 */
import type { AgentContext, AgentResult, IncidentCreatedPayload } from '../lib/governance/types/events'
import { regulatorTemplates, safeInsert, type RegulatorTemplate } from '../lib/governance/agentHelpers'

// Map a drafted template onto the regulator_filings CHECK'd regulation values
// (NIS2|DORA|GDPR-33|GDPR-34|EU-AI-Act-73|SEC-1.05|FCA|PRA|Other).
function regulationFor(t: RegulatorTemplate): string {
  if (t.template.includes('GDPR')) return 'GDPR-33'
  if (t.template.includes('EU AI Act')) return 'EU-AI-Act-73'
  if (t.regulator === 'SEC') return 'SEC-1.05'
  if (t.regulator === 'FCA') return 'FCA'
  return 'Other'
}

export async function regulatorNotifyAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as IncidentCreatedPayload
  const jurisdictions = ['US','UK','EU']
  const templates = regulatorTemplates({
    severity: p.severity, dataBreach: p.type === 'DATA_BREACH', jurisdictions,
  })
  const notificationIds: string[] = []
  for (const t of templates) {
    // Real regulator_filings columns; org_id is filled by the DB default
    // under RLS — the client never sends the scoping column.
    const r = await safeInsert<{ id: string }>('regulator_filings', {
      title: `Filing: ${t.template} — incident ${p.incidentId}`,
      regulation: regulationFor(t),
      type: 'incident_report',
      status: 'draft',
      deadline: new Date(Date.now() + t.deadlineHours * 3600 * 1000).toISOString(),
      linked_incident_id: p.incidentId,
      regulator_name: t.regulator,
      content: { template: t.template, drafted_by: 'RegulatorNotifyAgent', event_id: ctx.event.id },
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
