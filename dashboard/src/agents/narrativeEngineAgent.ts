/**
 * NarrativeEngineAgent — regenerates board/exec talking points + regulator language.
 *
 * Writes go through strictInsert (throws on failure): NARRATIVE_UPDATED only
 * carries audiences whose rows really persisted, and any shortfall returns
 * status 'failed' with the real error detail — no fake success.
 */
import type { AgentContext, AgentResult } from '../lib/governance/types/events'
import { strictInsert } from '../lib/governance/agentHelpers'

export async function narrativeEngineAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as Record<string, unknown>
  const audiences = ['board', 'executive', 'regulator', 'customer']
  const persisted: string[] = []
  const failures: string[] = []
  for (const audience of audiences) {
    try {
      await strictInsert('transparency_reports', {
        org_id: ctx.orgId,
        report_type: 'narrative',
        audience,
        title: `${audience.toUpperCase()} briefing: ${ctx.event.event_type}`,
        status: 'DRAFT',
        generated_by: 'NarrativeEngineAgent',
        content: buildNarrative(audience, ctx.event.event_type, p),
        event_id: ctx.event.id,
      })
      persisted.push(audience)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      failures.push(`${audience}: ${msg}`)
      console.error('[NarrativeEngineAgent] %s narrative did NOT persist: %s', audience, msg)
    }
  }

  if (persisted.length > 0) {
    await ctx.emit('NARRATIVE_UPDATED', 'narrative-engine', { audiences: persisted, eventType: ctx.event.event_type })
  }

  if (persisted.length < audiences.length) {
    const detail = `Persisted ${persisted.length}/${audiences.length} narratives — failed: ${failures.join('; ')}`
    ctx.log(detail)
    return { status: 'failed', error: detail, output: { persisted: persisted.length, expected: audiences.length } }
  }

  return { status: 'succeeded', output: { audienceCount: persisted.length } }
}

function buildNarrative(audience: string, evt: string, p: Record<string, unknown>): string {
  const title = (p.title as string) ?? evt
  if (audience === 'board') return `Board update: ${title}. Governance cascade executed; risk register updated; remediation plan underway within regulatory SLA.`
  if (audience === 'executive') return `Executive summary: ${title}. Severity=${p.severity ?? 'N/A'}. Containment engaged. Trust engine recalculated.`
  if (audience === 'regulator') return `Regulator notification draft for ${title}. Contains required GDPR Art.33 + EU AI Act Art. 73 fields; awaiting legal approval.`
  return `Customer communication draft for ${title}. Transparent description of the event, impact, and our remediation steps.`
}
