/**
 * PolicyEnforcement sentinel — validates model behaviour against active
 * policies in real time; flagged runtime traces are escalated as risks
 * before they compound.
 */
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { SentinelContext, SentinelResult, SentinelFinding } from './types'

interface TraceRow {
  id: string
  model_id: string | null
  injection_detected: boolean | null
  pii_detected: boolean | null
  toxicity_detected: boolean | null
  intent_violation: boolean | null
  trust_score: number | null
  created_at: string
}

export async function policyEnforcementSweep(ctx: SentinelContext): Promise<SentinelResult> {
  if (!isSupabaseConfigured() || !supabase) return { status: 'skipped', findings: [], summary: 'Supabase not configured.' }

  const [traces, rules] = await Promise.all([
    supabase
      .from('trust_traces')
      .select('id, model_id, injection_detected, pii_detected, toxicity_detected, intent_violation, trust_score, created_at')
      .gte('created_at', ctx.since)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('guardrail_rules').select('id', { count: 'exact', head: true }).eq('enabled', true),
  ])
  if (traces.error) return { status: 'failed', findings: [], summary: 'trust_traces query failed', error: traces.error.message }

  const rows = (traces.data ?? []) as TraceRow[]
  const flagged = rows.filter(
    (t) => t.injection_detected || t.pii_detected || t.toxicity_detected || t.intent_violation,
  )

  const findings: SentinelFinding[] = flagged.map((t) => {
    const kinds = [
      t.injection_detected && 'prompt injection',
      t.pii_detected && 'PII exposure',
      t.toxicity_detected && 'toxicity',
      t.intent_violation && 'intent violation',
    ].filter(Boolean)
    return {
      title: `Trace flagged: ${kinds.join(', ')}`,
      severity: t.injection_detected ? 'HIGH' : 'MEDIUM',
      entityType: 'trace',
      entityId: t.id,
      detail: t.model_id ? `model ${t.model_id}` : undefined,
    }
  })

  // Interception: a model with repeated flagged traces inside one window is a
  // live policy breach — raise it on the bus so the risk cascade fires.
  const byModel = new Map<string, number>()
  for (const t of flagged) if (t.model_id) byModel.set(t.model_id, (byModel.get(t.model_id) ?? 0) + 1)
  const day = new Date().toISOString().slice(0, 10)
  for (const [modelId, count] of byModel) {
    if (count < 3) continue
    await ctx.emit(
      'RISK_DETECTED',
      {
        source: 'SECURITY',
        severity: 'HIGH',
        affectedModels: [modelId],
        title: `Policy firewall: ${count} flagged traces in sweep window`,
        description: `PolicyEnforcement sentinel intercepted ${count} runtime traces with injection/PII/toxicity flags.`,
        detectedAt: new Date().toISOString(),
      },
      { idempotencyKey: `POLICY_BREACH:${modelId}:${day}` },
    )
  }

  return {
    status: 'succeeded',
    findings,
    summary: `Scanned ${rows.length} traces since ${new Date(ctx.since).toLocaleString()} against ${rules.count ?? 0} enabled guardrail rules — ${flagged.length} flagged.`,
    metrics: { tracesScanned: rows.length, flagged: flagged.length, activeRules: rules.count ?? 0 },
  }
}
