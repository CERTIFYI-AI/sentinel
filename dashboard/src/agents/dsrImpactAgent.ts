/**
 * DSRImpactAgent — on a personal-data breach, opens the Art. 34 communication
 * record that the controller owes affected data subjects.
 *
 * Every field this agent wrote was wrong, and it never noticed:
 *
 *   deadline_at            column does not exist (it is due_date)
 *   batch                  column does not exist (it is is_batch)
 *   created_by             column does not exist (it is created_by_agent)
 *   request_type           'BREACH_NOTIFICATION' is not in the CHECK vocabulary
 *   status                 'BULK_PENDING' is not in the CHECK vocabulary
 *
 * safeInsert swallows a rejected insert into a console.warn and returns null,
 * so the agent then emitted DSR_IMPACT_ASSESSED and returned
 * `status: 'succeeded'` with an empty id list. The mesh reported a completed
 * breach-notification step while the register stayed empty — the same
 * fake-success failure the UI layer had, one level down.
 *
 * The agent now writes real columns and real vocabulary values, and reports
 * `failed` when the write does not land.
 */
import type { AgentContext, AgentResult, IncidentCreatedPayload } from '../lib/governance/types/events'
import { safeInsert } from '../lib/governance/agentHelpers'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Art. 34 communication is not itself one of the Art. 15–22 rights, but it is
 * tracked in the same register because it carries the same shape: a duty owed
 * to identified data subjects against a hard deadline. It is recorded as a
 * restriction request — processing of the affected records is what the
 * controller must in practice constrain — and marked is_batch so the UI shows
 * a subject count instead of a single requester's name.
 */
const BREACH_REQUEST_TYPE = 'restriction'

export async function dsrImpactAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as IncidentCreatedPayload
  if ((p.affectedSubjects ?? 0) === 0 && p.type !== 'DATA_BREACH') return { status: 'skipped' }
  const subjects = p.affectedSubjects ?? 0

  // Idempotence: the incident cascade can re-run (retry, replay, a second
  // INCIDENT_CREATED for the same incident). Without this the register would
  // accumulate a duplicate Art. 34 record per run.
  if (isSupabaseConfigured() && supabase && p.incidentId) {
    const { data: existing } = await supabase
      .from('dsar_requests').select('id')
      .eq('incident_id', p.incidentId).eq('is_batch', true)
      .eq('is_deleted', false).limit(1)
    if (existing?.length) {
      ctx.log(`Art. 34 record already open for incident ${p.incidentId}`)
      return { status: 'skipped', output: { dsrIds: [existing[0].id] } }
    }
  }

  // Art. 34 requires communication "without undue delay". The 72 hours here is
  // the Art. 33 supervisory-authority clock, used as the working deadline
  // because it is the earlier and harder of the two.
  const due = new Date(Date.now() + 72 * 3600 * 1000).toISOString().slice(0, 10)

  const parent = await safeInsert<{ id: string }>('dsar_requests', {
    // org_id is deliberately omitted — the DB default fills it.
    requester_name: `Breach communication — ${subjects} data subjects`,
    request_type: BREACH_REQUEST_TYPE,
    status: 'pending',
    priority: subjects >= 1000 ? 'urgent' : 'high',
    description:
      `Automatically opened from incident ${p.incidentId}. GDPR Art. 34 requires ` +
      `communication of the breach to each affected data subject without undue delay.`,
    incident_id: p.incidentId,
    subject_count: subjects,
    legal_basis: 'GDPR Art. 34 — communication of a personal data breach to the data subject',
    due_date: due,
    submitted_date: new Date().toISOString().slice(0, 10),
    is_batch: true,
    source: 'incident',
    auto_generated: true,
    created_by_agent: 'DSRImpactAgent',
    source_event_id: ctx.event.id,
  })

  if (!parent?.id) {
    // Report the failure instead of emitting a success event over a write that
    // did not happen. A missed Art. 34 communication is a reportable breach of
    // its own; the mesh must not paper over it.
    ctx.log(`Art. 34 record could NOT be created for incident ${p.incidentId}`)
    return {
      status: 'failed',
      error: 'Failed to create the Art. 34 breach-communication record',
    }
  }

  await ctx.emit('DSR_IMPACT_ASSESSED', 'dsr-rights', {
    incidentId: p.incidentId, affectedSubjects: subjects, dsrIds: [parent.id],
  })
  ctx.log(`Art. 34 communication record opened for ${subjects} subjects, due ${due}`)
  return { status: 'succeeded', output: { affectedSubjects: subjects, dsrIds: [parent.id] } }
}
