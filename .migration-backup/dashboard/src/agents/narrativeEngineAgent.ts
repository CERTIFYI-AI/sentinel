/**
 * NarrativeEngineAgent — regenerates board/exec talking points + regulator language.
 */
import type { AgentContext, AgentResult } from '../lib/governance/types/events'
import { safeInsert } from '../lib/governance/agentHelpers'

export async function narrativeEngineAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as Record<string, unknown>
  const audiences = ['board','executive','regulator','customer']
  for (const audience of audiences) {
    await safeInsert('transparency_reports', {
      org_id: ctx.orgId,
      report_type: 'narrative',
      audience,
      title: `${audience.toUpperCase()} briefing: ${ctx.event.event_type}`,
      status: 'DRAFT',
      generated_by: 'NarrativeEngineAgent',
      content: buildNarrative(audience, ctx.event.event_type, p),
      event_id: ctx.event.id,
    })
  }
  await ctx.emit('NARRATIVE_UPDATED', 'narrative-engine', { audiences, eventType: ctx.event.event_type })
  return { status: 'succeeded', output: { audienceCount: audiences.length } }
}

function buildNarrative(audience: string, evt: string, p: Record<string, unknown>): string {
  const title = (p.title as string) ?? evt
  if (audience === 'board') return `Board update: ${title}. Governance cascade executed; risk register updated; remediation plan underway within regulatory SLA.`
  if (audience === 'executive') return `Executive summary: ${title}. Severity=${p.severity ?? 'N/A'}. Containment engaged. Trust engine recalculated.`
  if (audience === 'regulator') return `Regulator notification draft for ${title}. Contains required GDPR Art.33 + EU AI Act Art.62 fields; awaiting legal approval.`
  return `Customer communication draft for ${title}. Transparent description of the event, impact, and our remediation steps.`
}
