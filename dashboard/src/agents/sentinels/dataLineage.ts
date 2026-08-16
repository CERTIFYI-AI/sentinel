/**
 * DataLineage sentinel — verifies training-data provenance continuously:
 * PII datasets must carry a fresh audit trail, and active models must have
 * documented dataset lineage.
 */
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { SentinelContext, SentinelResult, SentinelFinding } from './types'

const PII_AUDIT_MAX_AGE_DAYS = 180

interface DatasetRow {
  id: string
  name: string
  contains_pii: boolean | null
  last_audit_date: string | null
  linked_models: unknown
}
interface ModelRow { id: string; name: string; is_active: boolean | null }

export async function dataLineageSweep(ctx: SentinelContext): Promise<SentinelResult> {
  if (!isSupabaseConfigured() || !supabase) return { status: 'skipped', findings: [], summary: 'Supabase not configured.' }

  const [datasetsRes, modelsRes] = await Promise.all([
    supabase.from('datasets').select('id, name, contains_pii, last_audit_date, linked_models'),
    supabase.from('ai_models').select('id, name, is_active'),
  ])
  if (datasetsRes.error) return { status: 'failed', findings: [], summary: 'datasets query failed', error: datasetsRes.error.message }
  if (modelsRes.error) return { status: 'failed', findings: [], summary: 'ai_models query failed', error: modelsRes.error.message }

  const datasets = (datasetsRes.data ?? []) as DatasetRow[]
  const models = ((modelsRes.data ?? []) as ModelRow[]).filter((m) => m.is_active !== false)
  const findings: SentinelFinding[] = []
  const cutoff = Date.now() - PII_AUDIT_MAX_AGE_DAYS * 86400_000

  // 1. PII datasets without a fresh audit trail.
  for (const d of datasets) {
    if (!d.contains_pii) continue
    const audited = d.last_audit_date ? new Date(d.last_audit_date).getTime() >= cutoff : false
    if (!audited) {
      findings.push({
        title: d.last_audit_date
          ? `PII dataset "${d.name}" audit older than ${PII_AUDIT_MAX_AGE_DAYS}d`
          : `PII dataset "${d.name}" has never been audited`,
        severity: 'HIGH',
        entityType: 'dataset',
        entityId: d.id,
      })
    }
  }

  // 2. Active models with no documented dataset lineage.
  const linked = new Set<string>()
  for (const d of datasets) {
    const arr = Array.isArray(d.linked_models) ? (d.linked_models as unknown[]) : []
    for (const v of arr) if (typeof v === 'string') linked.add(v)
  }
  const orphaned = models.filter((m) => !linked.has(m.id) && !linked.has(m.name))
  for (const m of orphaned) {
    findings.push({
      title: `No dataset lineage documented for model ${m.name}`,
      severity: 'MEDIUM',
      entityType: 'model',
      entityId: m.id,
    })
  }

  if (findings.length > 0) {
    const day = new Date().toISOString().slice(0, 10)
    await ctx.emit(
      'DATA_GOVERNANCE_CHECK',
      {
        gaps: findings.length,
        piiAuditGaps: findings.filter((f) => f.entityType === 'dataset').length,
        lineageGaps: orphaned.map((m) => m.id),
        detectedAt: new Date().toISOString(),
      },
      { idempotencyKey: `LINEAGE:${ctx.orgId}:${day}` },
    )
  }

  return {
    status: 'succeeded',
    findings,
    summary: `Verified provenance across ${datasets.length} datasets and ${models.length} active models — ${findings.length} gaps.`,
    metrics: { datasets: datasets.length, models: models.length, gaps: findings.length },
  }
}
