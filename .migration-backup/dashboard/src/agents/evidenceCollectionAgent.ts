/**
 * EvidenceCollectionAgent — captures evidence + tamper-proof hash chain.
 */
import type { AgentContext, AgentResult } from '../lib/governance/types/events'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { safeInsert } from '../lib/governance/agentHelpers'

async function sha256(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  }
  let h = 0
  for (let i = 0; i < text.length; i++) h = ((h << 5) - h + text.charCodeAt(i)) | 0
  return h.toString(16)
}

export async function evidenceCollectionAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as Record<string, unknown>
  const incidentId = (p.incidentId as string) ?? (p.riskId as string)
  if (!incidentId) return { status: 'skipped' }

  // previous hash from chain
  let prevHash = 'GENESIS'
  if (isSupabaseConfigured()) {
    const { data } = await supabase.from('evidence_chain')
      .select('hash').eq('org_id', ctx.orgId).order('created_at', { ascending: false }).limit(1)
    if (data && data[0]) prevHash = data[0].hash
  }

  const payload = JSON.stringify({
    orgId: ctx.orgId, incidentId,
    eventType: ctx.event.event_type,
    capturedAt: new Date().toISOString(),
    actor: 'EvidenceCollectionAgent',
    payload: p,
  })
  const hash = await sha256(prevHash + payload)

  await safeInsert('evidence_chain', {
    org_id: ctx.orgId,
    entity_type: p.incidentId ? 'incident' : 'risk',
    entity_id: incidentId,
    action: ctx.event.event_type,
    actor: 'EvidenceCollectionAgent',
    prev_hash: prevHash,
    hash,
    metadata: { captured: payload.length, eventId: ctx.event.id },
  })
  await safeInsert('evidence', {
    org_id: ctx.orgId,
    entity_type: 'incident',
    entity_id: incidentId,
    evidence_type: 'AUTO_COLLECTED',
    captured_at: new Date().toISOString(),
    hash, prev_hash: prevHash,
    source_event_id: ctx.event.id,
    description: `Automated evidence capture for ${ctx.event.event_type}`,
  })
  await ctx.emit('EVIDENCE_COLLECTED', 'evidence-vault', {
    incidentId, evidenceIds: [ctx.event.id], vaultHash: hash,
  })
  ctx.log(`Evidence hash=${hash.slice(0,8)}…`)
  return { status: 'succeeded', output: { hash } }
}
