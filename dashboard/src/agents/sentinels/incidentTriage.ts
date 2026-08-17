/**
 * IncidentTriage sentinel — auto-classifies unrouted governance incidents
 * and flags SLA breaches on stale criticals. Uses the platform severity
 * taxonomy already on the incidents table (critical/high/medium/low).
 */
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { safeUpdate } from '../../lib/governance/agentHelpers'
import type { SentinelContext, SentinelResult, SentinelFinding } from './types'

interface IncidentRow {
  id: string
  title: string
  severity: string | null
  status: string | null
  incident_type: string | null
  assignee: string | null
  detected_at: string | null
  created_at: string
  affected_users_count: number | null
}

const SLA_HOURS: Record<string, number> = { critical: 4, high: 24 }

function classify(row: IncidentRow): { severity: string; assignee: string } {
  const type = (row.incident_type ?? '').toLowerCase()
  let severity = 'medium'
  if (type.includes('breach') || (row.affected_users_count ?? 0) > 10_000) severity = 'critical'
  else if (type.includes('security') || type.includes('model_failure')) severity = 'high'
  const assignee = severity === 'critical' ? 'ciso' : severity === 'high' ? 'head-of-risk' : 'incident-manager'
  return { severity, assignee }
}

export async function incidentTriageSweep(ctx: SentinelContext): Promise<SentinelResult> {
  if (!isSupabaseConfigured() || !supabase) return { status: 'skipped', findings: [], summary: 'Supabase not configured.' }

  const { data, error } = await supabase
    .from('incidents')
    .select('id, title, severity, status, incident_type, assignee, detected_at, created_at, affected_users_count')
    .in('status', ['open', 'OPEN', 'investigating', 'triage'])
    .limit(500)
  if (error) return { status: 'failed', findings: [], summary: 'incidents query failed', error: error.message }

  const rows = (data ?? []) as IncidentRow[]
  const findings: SentinelFinding[] = []
  let triaged = 0
  const day = new Date().toISOString().slice(0, 10)

  for (const inc of rows) {
    // 1. Untriaged: missing severity or assignee → classify and route.
    if (!inc.severity || !inc.assignee) {
      const { severity, assignee } = classify(inc)
      const updated = await safeUpdate('incidents', {
        severity: inc.severity ?? severity,
        assignee: inc.assignee ?? assignee,
      }, { id: inc.id })
      if (updated) {
        triaged++
        findings.push({
          title: `Triaged "${inc.title}" → ${inc.severity ?? severity}, routed to ${inc.assignee ?? assignee}`,
          severity: 'INFO',
          entityType: 'incident',
          entityId: inc.id,
        })
      }
    }

    // 2. SLA breach on stale critical/high incidents.
    const sev = (inc.severity ?? '').toLowerCase()
    const slaHours = SLA_HOURS[sev]
    if (slaHours) {
      const openedAt = new Date(inc.detected_at ?? inc.created_at).getTime()
      const ageHours = (ctx.now() - openedAt) / 3600_000
      if (ageHours > slaHours) {
        findings.push({
          title: `SLA breached: "${inc.title}" open ${Math.round(ageHours)}h (SLA ${slaHours}h)`,
          severity: sev === 'critical' ? 'CRITICAL' : 'HIGH',
          entityType: 'incident',
          entityId: inc.id,
        })
        await ctx.emit(
          'SLA_BREACHED',
          {
            source: 'VENDOR_SLA',
            severity: sev === 'critical' ? 'CRITICAL' : 'HIGH',
            affectedModels: [],
            title: `Incident SLA breached: ${inc.title}`,
            description: `Open ${Math.round(ageHours)}h against a ${slaHours}h ${sev} SLA.`,
            detectedAt: new Date().toISOString(),
            incidentId: inc.id,
          },
          { idempotencyKey: `INC_SLA:${inc.id}:${day}` },
        )
      }
    }
  }

  return {
    status: 'succeeded',
    findings,
    summary: `Reviewed ${rows.length} open incidents — ${triaged} triaged, ${findings.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH').length} SLA breaches.`,
    metrics: { openIncidents: rows.length, triaged },
  }
}
