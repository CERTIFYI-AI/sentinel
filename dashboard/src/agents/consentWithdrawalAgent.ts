/**
 * ConsentWithdrawalAgent — turns an Art. 7(3) withdrawal into tracked work.
 *
 * Withdrawing consent is not a state change in a register; it is an obligation
 * that starts running. Art. 7(3) requires that processing based on that
 * consent stop, and Art. 17(1)(b) gives the subject an erasure right once the
 * basis is gone. Until this agent existed, the Consent page toasted that
 * "linked AI systems have been notified" and nothing anywhere was notified,
 * scheduled or recorded.
 *
 * What this agent actually writes:
 *   * a restriction request in the rights register, linked back to the consent
 *     record and carrying the models that must cease processing, so the duty
 *     appears on the same board as every other statutory deadline;
 *   * a risk, but only when the withdrawal leaves systems still processing —
 *     a withdrawal covering no system is bookkeeping, not exposure.
 */
import type {
  AgentContext, AgentResult, ConsentWithdrawnPayload,
} from '../lib/governance/types/events'
import { safeInsert } from '../lib/governance/agentHelpers'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Art. 7(3) has no fixed deadline — it says processing must stop, without
 * naming a period. Fourteen days is this platform's internal service level,
 * not a statutory figure, and is labelled as such wherever it is shown.
 */
const INTERNAL_CESSATION_SLA_DAYS = 14

export async function consentWithdrawalAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as ConsentWithdrawnPayload
  if (!p?.consentId) return { status: 'skipped' }

  // Re-running the cascade must not open a second obligation for the same
  // withdrawal.
  if (isSupabaseConfigured() && supabase) {
    const { data: existing } = await supabase
      .from('dsar_requests').select('id')
      .eq('linked_consent_id', p.consentId)
      .eq('source', 'consent_withdrawal').eq('is_deleted', false).limit(1)
    if (existing?.length) {
      ctx.log(`cessation task already open for consent ${p.consentRef ?? p.consentId}`)
      return { status: 'skipped', output: { dsrId: existing[0].id } }
    }
  }

  const due = new Date(Date.now() + INTERNAL_CESSATION_SLA_DAYS * 86_400_000)
    .toISOString().slice(0, 10)
  const affected = p.affectedModels ?? []

  const task = await safeInsert<{ id: string }>('dsar_requests', {
    requester_name: p.subjectRef || `Consent ${p.consentRef ?? p.consentId}`,
    request_type: 'restriction',
    status: 'pending',
    priority: affected.length ? 'high' : 'normal',
    description:
      `Consent ${p.consentRef ?? p.consentId} was withdrawn${p.reason ? `: ${p.reason}` : ''}. ` +
      `Under Art. 7(3) processing based on that consent must stop` +
      (affected.length ? ` in ${affected.length} linked system(s).` : '.'),
    legal_basis: 'GDPR Art. 7(3) — withdrawal of consent',
    due_date: due,
    submitted_date: p.withdrawnAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    linked_consent_id: p.consentId,
    linked_ropa_id: p.ropaId ?? null,
    linked_model_ids: affected,
    source: 'consent_withdrawal',
    auto_generated: true,
    created_by_agent: 'ConsentWithdrawalAgent',
    source_event_id: ctx.event.id ?? null,
  })

  if (!task?.id) {
    ctx.log(`could NOT open the cessation task for consent ${p.consentRef ?? p.consentId}`)
    return { status: 'failed', error: 'Failed to open the Art. 7(3) cessation task' }
  }

  // Only raise a risk where there is something to be exposed about. A
  // withdrawal that covers no linked system leaves nothing still processing.
  if (affected.length > 0) {
    await ctx.emit('RISK_DETECTED', 'privacy', {
      source: 'REGULATORY',
      severity: affected.length >= 3 ? 'HIGH' : 'MEDIUM',
      affectedModels: affected,
      title: `Consent withdrawn while ${affected.length} system(s) still process the data`,
      description:
        `Consent ${p.consentRef ?? p.consentId} was withdrawn under Art. 7(3). ` +
        `Processing must cease in the linked systems; the risk closes when cessation ` +
        `is confirmed on the linked rights request.`,
      detectedAt: new Date().toISOString(),
    })
  }

  await ctx.emit('PRIVACY_GAP_FOUND', 'privacy', {
    kind: 'CONSENT_LAPSED',
    entityTable: 'consent_records',
    entityId: p.consentId,
    entityRef: p.consentRef,
    title: 'Consent withdrawn — cessation outstanding',
    description: `Tracked as rights request ${task.id}; due ${due}.`,
    severity: affected.length ? 'HIGH' : 'LOW',
  })

  ctx.log(`Art. 7(3) cessation task opened for ${p.consentRef ?? p.consentId}, due ${due}`)
  return { status: 'succeeded', output: { dsrId: task.id, affectedModels: affected.length } }
}
