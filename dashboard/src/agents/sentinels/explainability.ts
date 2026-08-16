/**
 * Explainability sentinel — tracks explanation coverage per model version.
 * Models without a current SHAP/LIME record are surfaced as coverage gaps;
 * regulated models missing explanations become compliance risks.
 */
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { SentinelContext, SentinelResult, SentinelFinding } from './types'

const EXPLANATION_MAX_AGE_DAYS = 180

interface ModelRow { id: string; name: string; is_active: boolean | null; is_regulated: boolean | null; version: string | null }
interface ExplanationRow { model_id: string; model_version: string | null; computed_at: string }

export async function explainabilitySweep(ctx: SentinelContext): Promise<SentinelResult> {
  if (!isSupabaseConfigured() || !supabase) return { status: 'skipped', findings: [], summary: 'Supabase not configured.' }

  const [modelsRes, explRes] = await Promise.all([
    supabase.from('ai_models').select('id, name, is_active, is_regulated, version'),
    supabase.from('model_explanations').select('model_id, model_version, computed_at').order('computed_at', { ascending: false }).limit(2000),
  ])
  if (modelsRes.error) return { status: 'failed', findings: [], summary: 'ai_models query failed', error: modelsRes.error.message }
  if (explRes.error) return { status: 'failed', findings: [], summary: 'model_explanations query failed', error: explRes.error.message }

  const models = ((modelsRes.data ?? []) as ModelRow[]).filter((m) => m.is_active !== false)
  const explanations = (explRes.data ?? []) as ExplanationRow[]
  const cutoff = Date.now() - EXPLANATION_MAX_AGE_DAYS * 86400_000

  const latestByModel = new Map<string, ExplanationRow>()
  for (const e of explanations) if (!latestByModel.has(e.model_id)) latestByModel.set(e.model_id, e)

  const findings: SentinelFinding[] = []
  const day = new Date().toISOString().slice(0, 10)

  for (const m of models) {
    const latest = latestByModel.get(m.id)
    const fresh = latest && new Date(latest.computed_at).getTime() >= cutoff
    const versionMatch = !latest?.model_version || !m.version || latest.model_version === m.version

    if (!latest || !fresh || !versionMatch) {
      const reason = !latest
        ? 'no explanation on record'
        : !versionMatch
          ? `explanation is for version ${latest.model_version}, deployed is ${m.version}`
          : `explanation older than ${EXPLANATION_MAX_AGE_DAYS}d`
      findings.push({
        title: `Explainability gap on ${m.name}: ${reason}`,
        severity: m.is_regulated ? 'HIGH' : 'MEDIUM',
        entityType: 'model',
        entityId: m.id,
      })
      if (m.is_regulated) {
        await ctx.emit(
          'RISK_DETECTED',
          {
            source: 'REGULATORY',
            severity: 'MEDIUM',
            affectedModels: [m.id],
            title: `Regulated model ${m.name} lacks current explainability record`,
            description: reason,
            detectedAt: new Date().toISOString(),
          },
          { idempotencyKey: `XAI_GAP:${m.id}:${day}` },
        )
      }
    }
  }

  return {
    status: 'succeeded',
    findings,
    summary: `Checked explanation coverage on ${models.length} active models against ${explanations.length} stored explanations — ${findings.length} gaps.`,
    metrics: { models: models.length, explanations: explanations.length, gaps: findings.length },
  }
}
