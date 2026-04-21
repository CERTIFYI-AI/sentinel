/**
 * DSRImpactAgent — identifies affected data subjects and creates DSR entries.
 */
import type { AgentContext, AgentResult, IncidentCreatedPayload } from '../lib/governance/types/events'
import { safeInsert } from '../lib/governance/agentHelpers'

export async function dsrImpactAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as IncidentCreatedPayload
  if ((p.affectedSubjects ?? 0) === 0 && p.type !== 'DATA_BREACH') return { status: 'skipped' }
  const subjects = p.affectedSubjects ?? 0
  const dsrIds: string[] = []
  // Create a parent bulk-DSR entry (we don't create 10,000 individual rows — we create one batch)
  const parent = await safeInsert<{ id: string }>('dsar_requests', {
    org_id: ctx.orgId,
    request_type: 'BREACH_NOTIFICATION',
    status: 'BULK_PENDING',
    incident_id: p.incidentId,
    subject_count: subjects,
    legal_basis: 'GDPR Art.34 — communication of breach to data subject',
    deadline_at: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    batch: true,
    created_by: 'DSRImpactAgent',
  })
  if (parent?.id) dsrIds.push(parent.id)
  await ctx.emit('DSR_IMPACT_ASSESSED', 'dsr-rights', {
    incidentId: p.incidentId, affectedSubjects: subjects, dsrIds,
  })
  ctx.log(`DSR batch created for ${subjects} subjects`)
  return { status: 'succeeded', output: { affectedSubjects: subjects, dsrIds } }
}
