/**
 * Reporting sentinel — compiles the org's real AI-risk posture into a
 * scheduled digest: mesh activity, open risks, incident posture, model
 * counts. Real counts only — no invented metrics. At most one digest per
 * 20h window.
 */
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { safeInsert } from '../../lib/governance/agentHelpers'
import type { SentinelContext, SentinelResult } from './types'

export async function reportingSweep(ctx: SentinelContext): Promise<SentinelResult> {
  if (!isSupabaseConfigured() || !supabase) return { status: 'skipped', findings: [], summary: 'Supabase not configured.' }

  // Skip if a digest already went out in the last 20h.
  const windowStart = new Date(ctx.now() - 20 * 3600_000).toISOString()
  const { data: recent } = await supabase
    .from('notifications')
    .select('id')
    .eq('notification_type', 'mesh_digest')
    .gte('created_at', windowStart)
    .limit(1)
  if (recent && recent.length > 0) {
    return { status: 'skipped', findings: [], summary: 'Digest already compiled in the last 20h.' }
  }

  const dayAgo = new Date(ctx.now() - 86400_000).toISOString()
  const [events, execs, risks, incidents, models] = await Promise.all([
    supabase.from('governance_events').select('id', { count: 'exact', head: true }).eq('org_id', ctx.orgId).gte('created_at', dayAgo),
    supabase.from('agent_executions').select('id', { count: 'exact', head: true }).eq('org_id', ctx.orgId).eq('status', 'failed').gte('started_at', dayAgo),
    // org-scoped like the sibling queries (RLS alone is not enough under a
    // service-role client), and matching the UI's status semantics: a risk
    // is open unless resolved/closed/accepted.
    supabase.from('risks').select('id', { count: 'exact', head: true })
      .eq('tenant_id', ctx.orgId).eq('is_deleted', false)
      .not('status', 'in', '(resolved,closed,accepted,mitigated)'),
    supabase.from('incidents').select('id', { count: 'exact', head: true })
      .eq('tenant_id', ctx.orgId)
      .not('status', 'in', '(resolved,closed)'),
    supabase.from('ai_models').select('id', { count: 'exact', head: true }),
  ])

  const lines = [
    `Governance events (24h): ${events.count ?? 0}`,
    `Agent execution failures (24h): ${execs.count ?? 0}`,
    `Open risks: ${risks.count ?? 0}`,
    `Open incidents: ${incidents.count ?? 0}`,
    `Models under governance: ${models.count ?? 0}`,
  ]

  const inserted = await safeInsert('notifications', {
    title: 'AI governance daily digest',
    message: lines.join(' · '),
    notification_type: 'mesh_digest',
    entity_type: 'mesh',
    is_read: false,
  })
  if (!inserted) {
    return { status: 'failed', findings: [], summary: 'Digest compiled but the notifications write failed.', error: 'notifications insert failed' }
  }

  return {
    status: 'succeeded',
    findings: [{ title: 'Compiled daily governance digest', severity: 'INFO' }],
    summary: `Digest compiled: ${lines.join('; ')}.`,
    metrics: {
      events24h: events.count ?? 0,
      failedExecs24h: execs.count ?? 0,
      openRisks: risks.count ?? 0,
      openIncidents: incidents.count ?? 0,
      models: models.count ?? 0,
    },
  }
}
