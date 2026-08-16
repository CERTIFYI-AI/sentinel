/**
 * PrivacyPostureAgent — sweeps the privacy registers for duties that have gone
 * unmet, and writes each one into the risk register where it can be worked.
 *
 * The four gaps it looks for are the ones that are invisible by construction:
 * each is a record that looks complete on its own page and is only wrong in
 * relation to something else.
 *
 *   TRANSFER_NO_MECHANISM     A Chapter V transfer with no mechanism recorded.
 *                             Nothing on the TIA page is red — the row simply
 *                             has an empty field — but a transfer without
 *                             adequacy, SCCs, BCRs or a derogation is an
 *                             unlawful transfer.
 *   DPIA_RESIDUAL_UNTRACKED   A DPIA closed with high or critical residual
 *                             risk and no risk in the register. Art. 36
 *                             requires prior consultation in that state; an
 *                             unlinked DPIA is a finding that dies where it
 *                             was written.
 *   CONSENT_LAPSED            A consent still recorded as granted past its own
 *                             expiry date. The register asserts a lawful basis
 *                             the record itself contradicts.
 *   DSR_OVERDUE               A rights request past the Art. 12(3) month.
 *
 * The agent is deliberately conservative: it opens a risk, it does not close
 * one, and it does not modify the underlying statutory record. Deciding that a
 * transfer is lawful, or that a residual risk is accepted, is a human judgement
 * under Art. 14 human oversight — the agent's job is to make sure that
 * judgement is asked for, not to make it.
 */
import type {
  AgentContext, AgentResult, PrivacyGapFoundPayload, Severity,
} from '../lib/governance/types/events'
import { safeInsert } from '../lib/governance/agentHelpers'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const SEVERITY_SCORE: Record<Severity, number> = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2 }

interface Gap extends Omit<PrivacyGapFoundPayload, 'riskId'> {
  models?: string[]
}

/**
 * One risk per finding, keyed by the record it came from. Re-running the sweep
 * must not multiply risks — the register would fill with duplicates of the
 * same unresolved gap and stop being readable.
 */
async function existingRiskFor(entityTable: string, entityId: string): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data } = await supabase
    .from('risks').select('id')
    .eq('related_entity_type', entityTable)
    .eq('related_entity_id', entityId)
    .eq('source', 'auto-agent')
    .neq('mitigation_status', 'closed')
    .limit(1)
  return data?.length ? String(data[0].id) : null
}

async function findTransferGaps(): Promise<Gap[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data } = await supabase
    .from('transfer_impact_assessments')
    .select('id, reference, transfer_name, source_country, destination_country, transfer_mechanism, linked_model_ids')
  return (data ?? [])
    .filter((t: any) => !t.transfer_mechanism)
    .map((t: any) => ({
      kind: 'TRANSFER_NO_MECHANISM' as const,
      entityTable: 'transfer_impact_assessments',
      entityId: t.id,
      entityRef: t.reference ?? undefined,
      title: `Cross-border transfer with no Chapter V mechanism: ${t.transfer_name}`,
      description:
        `${t.source_country ?? 'unknown'} → ${t.destination_country ?? 'unknown'} is recorded with no ` +
        `adequacy decision, standard contractual clauses, binding corporate rules or Art. 49 derogation. ` +
        `Until one is identified and recorded, the transfer has no lawful basis under Chapter V.`,
      severity: 'CRITICAL' as Severity,
      models: t.linked_model_ids ?? [],
    }))
}

async function findDpiaGaps(): Promise<Gap[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data } = await supabase
    .from('dpia_assessments')
    .select('id, reference, title, residual_risk_level, linked_risk_id, consultation_required, consultation_date, linked_model_ids')
  return (data ?? [])
    .filter((d: any) =>
      ['high', 'critical'].includes(String(d.residual_risk_level ?? '').toLowerCase()) && !d.linked_risk_id)
    .map((d: any) => ({
      kind: 'DPIA_RESIDUAL_UNTRACKED' as const,
      entityTable: 'dpia_assessments',
      entityId: d.id,
      entityRef: d.reference ?? undefined,
      title: `DPIA residual risk not in the register: ${d.title}`,
      description:
        `Residual risk is recorded as ${d.residual_risk_level} with no linked risk. Art. 36 requires prior ` +
        `consultation with the supervisory authority where a DPIA indicates high residual risk` +
        (d.consultation_date ? `; a consultation is dated ${d.consultation_date}.` : ` and no consultation is recorded.`),
      severity: 'HIGH' as Severity,
      models: d.linked_model_ids ?? [],
    }))
}

async function findConsentGaps(): Promise<Gap[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('consent_records')
    .select('id, consent_ref, subject_ref, subject_name, expiry_date, linked_model_ids')
    .eq('status', 'granted').lt('expiry_date', today)
  return (data ?? []).map((c: any) => ({
    kind: 'CONSENT_LAPSED' as const,
    entityTable: 'consent_records',
    entityId: c.id,
    entityRef: c.consent_ref ?? undefined,
    title: `Consent recorded as granted past its expiry: ${c.consent_ref ?? c.id}`,
    description:
      `Expired on ${c.expiry_date} but is still recorded as granted, so the register asserts a lawful ` +
      `basis the record itself contradicts. Either re-obtain consent or move the linked processing to ` +
      `another basis; processing meanwhile has no Art. 6(1)(a) footing.`,
    severity: 'MEDIUM' as Severity,
    models: c.linked_model_ids ?? [],
  }))
}

async function findOverdueDsrs(): Promise<Gap[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('dsar_requests')
    .select('id, reference, request_type, due_date, status, linked_model_ids')
    .eq('is_deleted', false).lt('due_date', today)
    .not('status', 'in', '("completed","rejected")')
  return (data ?? []).map((d: any) => ({
    kind: 'DSR_OVERDUE' as const,
    entityTable: 'dsar_requests',
    entityId: d.id,
    entityRef: d.reference ?? undefined,
    title: `Rights request past the Art. 12(3) deadline: ${d.reference ?? d.id}`,
    description:
      `A ${d.request_type} request was due ${d.due_date} and is still ${d.status}. Art. 12(3) allows ` +
      `one month from receipt, extendable by two months for complex requests only where the subject ` +
      `has been told of the extension and why.`,
    severity: 'HIGH' as Severity,
    models: d.linked_model_ids ?? [],
  }))
}

export async function privacyPostureAgent(ctx: AgentContext): Promise<AgentResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { status: 'skipped', output: { reason: 'Supabase is not configured' } }
  }

  const gaps: Gap[] = [
    ...await findTransferGaps(),
    ...await findDpiaGaps(),
    ...await findConsentGaps(),
    ...await findOverdueDsrs(),
  ]

  if (gaps.length === 0) {
    ctx.log('privacy sweep found no open gaps')
    return { status: 'succeeded', output: { gaps: 0, risksCreated: 0 } }
  }

  const created: string[] = []
  const alreadyOpen: string[] = []
  const failed: string[] = []

  for (const gap of gaps) {
    const existing = await existingRiskFor(gap.entityTable, gap.entityId)
    if (existing) { alreadyOpen.push(existing); continue }

    const risk = await safeInsert<{ id: string }>('risks', {
      // tenant_id/org_id omitted — the DB default fills it.
      name: gap.title,
      description: gap.description,
      categories: ['Privacy & Data Protection'],
      likelihood: gap.severity === 'CRITICAL' ? 4 : 3,
      severity: SEVERITY_SCORE[gap.severity],
      risk_level: gap.severity.toLowerCase(),
      mitigation_status: 'open',
      ai_lifecycle_phase: 'operation',
      assessment_date: new Date().toISOString(),
      source: 'auto-agent',
      auto_generated: true,
      related_entity_type: gap.entityTable,
      related_entity_id: gap.entityId,
      source_event_id: ctx.event.id ?? null,
      metadata: {
        gapKind: gap.kind,
        entityRef: gap.entityRef,
        affectedModels: gap.models ?? [],
        createdBy: 'PrivacyPostureAgent',
      },
    })

    if (!risk?.id) { failed.push(gap.entityId); continue }
    created.push(risk.id)

    // Write the risk id back onto the DPIA, so the assessment stops being a
    // dead end and the page's "not in register" warning clears. Only the DPIA
    // carries a linked_risk_id — the other three gap kinds are reached from
    // the risk's own related_entity fields.
    if (gap.kind === 'DPIA_RESIDUAL_UNTRACKED') {
      const { error } = await supabase
        .from('dpia_assessments').update({ linked_risk_id: risk.id }).eq('id', gap.entityId)
      if (error) ctx.log(`could not link risk ${risk.id} back to DPIA ${gap.entityId}: ${error.message}`)
    }

    await ctx.emit('PRIVACY_GAP_FOUND', 'privacy', {
      ...gap, riskId: risk.id,
    } as PrivacyGapFoundPayload)
  }

  ctx.log(
    `privacy sweep: ${gaps.length} gap(s) — ${created.length} new risk(s), ` +
    `${alreadyOpen.length} already open, ${failed.length} failed to write`,
  )

  // A sweep that could not write what it found has not done its job, and must
  // not report success just because it completed.
  if (created.length === 0 && failed.length > 0) {
    return { status: 'failed', error: `Failed to record ${failed.length} privacy gap(s)` }
  }

  return {
    status: 'succeeded',
    output: {
      gaps: gaps.length, risksCreated: created.length,
      alreadyOpen: alreadyOpen.length, failed: failed.length,
      byKind: gaps.reduce<Record<string, number>>((a, g) => {
        a[g.kind] = (a[g.kind] ?? 0) + 1; return a
      }, {}),
    },
  }
}
