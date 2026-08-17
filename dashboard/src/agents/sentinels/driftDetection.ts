/**
 * DriftDetection sentinel — monitors registry drift signals for statistical
 * and conceptual drift, alerting before impact. Reads the measured
 * drift_score/drift_status columns on ai_models (populated by analytics
 * pipelines); never invents a score.
 */
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { SentinelContext, SentinelResult, SentinelFinding } from './types'

interface ModelDriftRow {
  id: string
  name: string
  is_active: boolean | null
  drift_status: string | null
  drift_score: number | null
}

const DRIFT_SCORE_THRESHOLD = 0.25

export async function driftDetectionSweep(ctx: SentinelContext): Promise<SentinelResult> {
  if (!isSupabaseConfigured() || !supabase) return { status: 'skipped', findings: [], summary: 'Supabase not configured.' }

  const { data, error } = await supabase
    .from('ai_models')
    .select('id, name, is_active, drift_status, drift_score')
  if (error) return { status: 'failed', findings: [], summary: 'ai_models query failed', error: error.message }

  const models = (data ?? []) as ModelDriftRow[]
  const active = models.filter((m) => m.is_active !== false)
  const measured = active.filter((m) => m.drift_score !== null || (m.drift_status && m.drift_status !== ''))

  const drifting = measured.filter(
    (m) =>
      (m.drift_status && !['stable', 'ok', 'none'].includes(m.drift_status.toLowerCase())) ||
      (m.drift_score !== null && m.drift_score >= DRIFT_SCORE_THRESHOLD),
  )

  const findings: SentinelFinding[] = drifting.map((m) => ({
    title: `Drift on ${m.name}: ${m.drift_status ?? 'score'} ${m.drift_score ?? ''}`.trim(),
    severity: (m.drift_score ?? 0) >= 0.5 ? 'HIGH' : 'MEDIUM',
    entityType: 'model',
    entityId: m.id,
  }))

  const day = new Date().toISOString().slice(0, 10)
  for (const m of drifting) {
    await ctx.emit(
      'DRIFT_DETECTED',
      {
        source: 'DRIFT',
        severity: (m.drift_score ?? 0) >= 0.5 ? 'HIGH' : 'MEDIUM',
        affectedModels: [m.id],
        title: `Model drift detected: ${m.name}`,
        description: `drift_status=${m.drift_status ?? 'n/a'} drift_score=${m.drift_score ?? 'n/a'}`,
        metrics: m.drift_score !== null ? { driftScore: m.drift_score } : undefined,
        detectedAt: new Date().toISOString(),
      },
      { idempotencyKey: `DRIFT:${m.id}:${day}` },
    )
  }

  return {
    status: 'succeeded',
    findings,
    summary:
      measured.length === 0
        ? `No drift telemetry recorded yet for ${active.length} active models — nothing to evaluate.`
        : `Evaluated drift telemetry on ${measured.length}/${active.length} active models — ${drifting.length} drifting.`,
    metrics: { activeModels: active.length, withTelemetry: measured.length, drifting: drifting.length },
  }
}
