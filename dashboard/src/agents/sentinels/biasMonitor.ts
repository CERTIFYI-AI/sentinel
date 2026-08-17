/**
 * BiasMonitor sentinel — continuous fairness coverage: every active model
 * must have a recent bias audit; low measured fairness scores are queued
 * for re-audit and raised on the bus.
 */
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { safeInsert } from '../../lib/governance/agentHelpers'
import type { SentinelContext, SentinelResult, SentinelFinding } from './types'

const AUDIT_MAX_AGE_DAYS = 90
const FAIRNESS_THRESHOLD = 0.8

interface ModelRow { id: string; name: string; is_active: boolean | null; fairness_score: number | null }
interface AuditRow { model_id: string | null; status: string | null; created_at: string }

export async function biasMonitorSweep(ctx: SentinelContext): Promise<SentinelResult> {
  if (!isSupabaseConfigured() || !supabase) return { status: 'skipped', findings: [], summary: 'Supabase not configured.' }

  const [modelsRes, auditsRes] = await Promise.all([
    supabase.from('ai_models').select('id, name, is_active, fairness_score'),
    supabase.from('bias_audits').select('model_id, status, created_at').order('created_at', { ascending: false }).limit(1000),
  ])
  if (modelsRes.error) return { status: 'failed', findings: [], summary: 'ai_models query failed', error: modelsRes.error.message }
  if (auditsRes.error) return { status: 'failed', findings: [], summary: 'bias_audits query failed', error: auditsRes.error.message }

  const models = ((modelsRes.data ?? []) as ModelRow[]).filter((m) => m.is_active !== false)
  const audits = (auditsRes.data ?? []) as AuditRow[]
  const cutoff = Date.now() - AUDIT_MAX_AGE_DAYS * 86400_000

  const latestByModel = new Map<string, AuditRow>()
  const pendingByModel = new Set<string>()
  for (const a of audits) {
    if (!a.model_id) continue
    if (!latestByModel.has(a.model_id)) latestByModel.set(a.model_id, a)
    const s = (a.status ?? '').toLowerCase()
    if (s === 'queued' || s === 'draft' || s === 'in progress' || s === 'running') pendingByModel.add(a.model_id)
  }

  const findings: SentinelFinding[] = []
  let queued = 0
  const day = new Date().toISOString().slice(0, 10)

  for (const m of models) {
    const lowFairness = m.fairness_score !== null && m.fairness_score < FAIRNESS_THRESHOLD
    const latest = latestByModel.get(m.id)
    const stale = !latest || new Date(latest.created_at).getTime() < cutoff

    if (lowFairness) {
      findings.push({
        title: `Fairness score ${m.fairness_score} below ${FAIRNESS_THRESHOLD} on ${m.name}`,
        severity: 'HIGH',
        entityType: 'model',
        entityId: m.id,
      })
      await ctx.emit(
        'RISK_DETECTED',
        {
          source: 'FAIRNESS',
          severity: 'HIGH',
          affectedModels: [m.id],
          title: `Fairness degradation on ${m.name}`,
          description: `Measured fairness score ${m.fairness_score} is below the ${FAIRNESS_THRESHOLD} threshold.`,
          metrics: { fairnessScore: m.fairness_score as number },
          detectedAt: new Date().toISOString(),
        },
        { idempotencyKey: `FAIRNESS:${m.id}:${day}` },
      )
    } else if (stale) {
      findings.push({
        title: latest
          ? `Bias audit older than ${AUDIT_MAX_AGE_DAYS}d on ${m.name}`
          : `No bias audit on record for ${m.name}`,
        severity: 'MEDIUM',
        entityType: 'model',
        entityId: m.id,
      })
    }

    // Queue a re-audit when coverage is missing/stale/low and none is pending.
    if ((lowFairness || stale) && !pendingByModel.has(m.id)) {
      const row = await safeInsert<{ id: string }>('bias_audits', {
        model_id: m.id,
        status: 'Queued',
        triggered_by: 'mesh-sentinel:BiasMonitor',
      })
      if (row) {
        queued++
        await ctx.emit(
          'FAIRNESS_SCAN_QUEUED',
          { modelId: m.id, scanId: row.id, reason: lowFairness ? 'low_fairness_score' : 'stale_coverage' },
          { idempotencyKey: `FSCAN:${m.id}:${day}` },
        )
      }
    }
  }

  return {
    status: 'succeeded',
    findings,
    summary: `Checked fairness coverage on ${models.length} active models — ${findings.length} gaps, ${queued} audits queued.`,
    metrics: { models: models.length, gaps: findings.length, auditsQueued: queued },
  }
}
