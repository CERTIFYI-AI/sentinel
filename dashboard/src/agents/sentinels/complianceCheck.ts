/**
 * ComplianceCheck sentinel — cross-references regulated / high-tier models
 * against the org's implemented framework controls and emits
 * CONTROL_GAP_FOUND for uncovered obligations.
 */
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { SentinelContext, SentinelResult, SentinelFinding } from './types'

interface ModelRow { id: string; name: string; is_active: boolean | null; is_regulated: boolean | null; risk_tier: string | null }
interface ControlRow { id: string; framework: string | null; status: string | null; implementation_status: string | null }

const IMPLEMENTED = new Set(['implemented', 'operating', 'effective', 'complete', 'completed'])

function isHighTier(m: ModelRow): boolean {
  const tier = (m.risk_tier ?? '').toLowerCase()
  return m.is_regulated === true || tier.includes('high') || tier.includes('1') || tier.includes('unacceptable')
}

export async function complianceCheckSweep(ctx: SentinelContext): Promise<SentinelResult> {
  if (!isSupabaseConfigured() || !supabase) return { status: 'skipped', findings: [], summary: 'Supabase not configured.' }

  const [modelsRes, controlsRes] = await Promise.all([
    supabase.from('ai_models').select('id, name, is_active, is_regulated, risk_tier'),
    supabase.from('controls').select('id, framework, status, implementation_status').limit(2000),
  ])
  if (modelsRes.error) return { status: 'failed', findings: [], summary: 'ai_models query failed', error: modelsRes.error.message }
  if (controlsRes.error) return { status: 'failed', findings: [], summary: 'controls query failed', error: controlsRes.error.message }

  const models = ((modelsRes.data ?? []) as ModelRow[]).filter((m) => m.is_active !== false)
  const controls = (controlsRes.data ?? []) as ControlRow[]
  const highTier = models.filter(isHighTier)

  // Implemented-vs-total per framework, from the org's real control register.
  const perFramework = new Map<string, { total: number; implemented: number }>()
  for (const c of controls) {
    const fw = c.framework ?? 'UNMAPPED'
    const bucket = perFramework.get(fw) ?? { total: 0, implemented: 0 }
    bucket.total++
    const s = (c.implementation_status ?? c.status ?? '').toLowerCase()
    if (IMPLEMENTED.has(s)) bucket.implemented++
    perFramework.set(fw, bucket)
  }

  const findings: SentinelFinding[] = []
  const day = new Date().toISOString().slice(0, 10)

  // Gap class 1: high-tier models exist but the org has no controls at all.
  if (highTier.length > 0 && controls.length === 0) {
    findings.push({
      title: `${highTier.length} regulated/high-tier models with no controls in the register`,
      severity: 'CRITICAL',
    })
  }

  // Gap class 2: frameworks with <50% of controls implemented.
  for (const [fw, { total, implemented }] of perFramework) {
    if (total === 0) continue
    const ratio = implemented / total
    if (ratio < 0.5) {
      findings.push({
        title: `${fw}: only ${implemented}/${total} controls implemented (${Math.round(ratio * 100)}%)`,
        severity: highTier.length > 0 ? 'HIGH' : 'MEDIUM',
      })
    }
  }

  if (findings.length > 0) {
    await ctx.emit(
      'CONTROL_GAP_FOUND',
      {
        gaps: findings.map((f) => f.title),
        highTierModels: highTier.map((m) => m.id),
        frameworks: Object.fromEntries(perFramework),
        detectedAt: new Date().toISOString(),
      },
      { idempotencyKey: `CTRL_GAP:${ctx.orgId}:${day}` },
    )
  }

  return {
    status: 'succeeded',
    findings,
    summary: `Mapped ${highTier.length} regulated/high-tier models against ${controls.length} controls across ${perFramework.size} frameworks — ${findings.length} gaps.`,
    metrics: { highTierModels: highTier.length, controls: controls.length, gaps: findings.length },
  }
}
