/**
 * RegulatorNotifyAgent — SEC / FCA / ICO (GDPR 72h) / EU AI Act Art. 73 templates.
 *
 * Statutory filing drafts must never claim success they didn't have: every
 * insert goes through strictInsert (throws on failure), REGULATOR_NOTIFIED is
 * emitted only for rows that actually persisted, and any shortfall returns
 * status 'failed' with the real error detail.
 */
import type { AgentContext, AgentResult, IncidentCreatedPayload } from '../lib/governance/types/events'
import { regulatorTemplates, strictInsert } from '../lib/governance/agentHelpers'

export async function regulatorNotifyAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as (IncidentCreatedPayload & { regulatoryReportable?: boolean })
  // Draft filings ONLY when the incident is actually reportable: either the
  // reporter flagged it (Art. 73 checkbox) or it is a P0/P1 data breach.
  // The previous unconditional ['US','UK','EU'] fan-out drafted 2+ filings —
  // each with a statutory deadline on the compliance calendar — for every
  // test incident.
  const reportable = p.regulatoryReportable === true
    || (p.type === 'DATA_BREACH' && (p.severity === 'P0' || p.severity === 'P1'))
  if (!reportable) return { status: 'skipped', error: 'not-regulatory-reportable' }
  const jurisdictions = ['EU']  // primary supervisory scope; others only on P0 breaches
  if (p.severity === 'P0' && p.type === 'DATA_BREACH') jurisdictions.push('US', 'UK')
  const templates = regulatorTemplates({
    severity: p.severity, dataBreach: p.type === 'DATA_BREACH', jurisdictions,
  })

  const persisted: { id: string; regulator: string }[] = []
  const failures: string[] = []
  for (const t of templates) {
    try {
      // Real regulator_filings columns; org_id is filled by the DB default
      // under RLS — the client never sends the scoping column. filing_ref is
      // minted by the DB trigger on insert. The deadline hours come from the
      // statutory window for the template's regulation (lib/statutoryWindows).
      const r = await strictInsert<{ id: string }>('regulator_filings', {
        title: `Filing: ${t.template} — incident ${p.incidentId}`,
        regulation: t.regulation,
        type: 'incident_report',
        status: 'draft',
        deadline: new Date(Date.now() + t.deadlineHours * 3600 * 1000).toISOString(),
        linked_incident_id: p.incidentId,
        regulator_name: t.regulator,
        content: { template: t.template, drafted_by: 'RegulatorNotifyAgent', event_id: ctx.event.id },
      })
      persisted.push({ id: r.id, regulator: t.regulator })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      failures.push(`${t.regulator}: ${msg}`)
      console.error(`[RegulatorNotifyAgent] filing draft for ${t.regulator} did NOT persist:`, msg)
    }
  }

  // Emit only what really exists — real regulators, real row ids.
  if (persisted.length > 0) {
    await ctx.emit('REGULATOR_NOTIFIED', 'regulator-notify', {
      incidentId: p.incidentId,
      regulators: persisted.map(x => x.regulator),
      notificationIds: persisted.map(x => x.id),
    })
  }

  if (persisted.length < templates.length) {
    const detail = `Drafted ${persisted.length}/${templates.length} regulator filings — MISSING statutory drafts: ${failures.join('; ')}`
    ctx.log(detail)
    // AgentResult has no 'partial' status — a shortfall on statutory filings
    // is a failure, reported loudly with the per-regulator error detail.
    return { status: 'failed', error: detail, output: { drafted: persisted.length, expected: templates.length } }
  }

  ctx.log(`Drafted ${persisted.length} regulator filings`)
  return { status: 'succeeded', output: { count: persisted.length } }
}
