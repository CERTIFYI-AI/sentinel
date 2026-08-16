/**
 * ChangeDetection sentinel — fingerprints every registered model
 * (version + provider + type). When the fingerprint changes, the model was
 * updated outside a governance gate: emit MODEL_UPDATED and queue a
 * reassessment so the change cannot ship silently.
 */
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { safeInsert } from '../../lib/governance/agentHelpers'
import type { SentinelContext, SentinelResult, SentinelFinding } from './types'

interface ModelRow { id: string; name: string; version: string | null; provider: string | null; model_type: string | null }
interface FingerprintRow { model_id: string; fingerprint: string; version_seen: string | null }

function fingerprintOf(m: ModelRow): string {
  const s = `${m.version ?? ''}|${m.provider ?? ''}|${m.model_type ?? ''}`
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return h.toString(36)
}

export async function changeDetectionSweep(ctx: SentinelContext): Promise<SentinelResult> {
  if (!isSupabaseConfigured() || !supabase) return { status: 'skipped', findings: [], summary: 'Supabase not configured.' }

  const [modelsRes, printsRes] = await Promise.all([
    supabase.from('ai_models').select('id, name, version, provider, model_type'),
    supabase.from('mesh_model_fingerprints').select('model_id, fingerprint, version_seen'),
  ])
  if (modelsRes.error) return { status: 'failed', findings: [], summary: 'ai_models query failed', error: modelsRes.error.message }
  if (printsRes.error) return { status: 'failed', findings: [], summary: 'mesh_model_fingerprints query failed', error: printsRes.error.message }

  const models = (modelsRes.data ?? []) as ModelRow[]
  const known = new Map(((printsRes.data ?? []) as FingerprintRow[]).map((p) => [p.model_id, p]))
  const findings: SentinelFinding[] = []
  let baselined = 0

  for (const m of models) {
    const fp = fingerprintOf(m)
    const prior = known.get(m.id)

    if (!prior) {
      // First sighting — record the baseline, no alert.
      const inserted = await safeInsert('mesh_model_fingerprints', {
        org_id: ctx.orgId,
        model_id: m.id,
        fingerprint: fp,
        version_seen: m.version,
      })
      if (inserted) baselined++
      continue
    }

    if (prior.fingerprint !== fp) {
      findings.push({
        title: `Model ${m.name} changed: ${prior.version_seen ?? 'unknown'} → ${m.version ?? 'unknown'}`,
        severity: 'HIGH',
        entityType: 'model',
        entityId: m.id,
      })

      const { error: upErr } = await supabase
        .from('mesh_model_fingerprints')
        .update({ fingerprint: fp, version_seen: m.version, seen_at: new Date().toISOString() })
        .eq('model_id', m.id)
      if (upErr) ctx.log(`fingerprint update failed for ${m.id}: ${upErr.message}`)

      await ctx.emit(
        'MODEL_UPDATED',
        {
          modelId: m.id,
          modelName: m.name,
          previousVersion: prior.version_seen,
          newVersion: m.version,
          detectedBy: 'ChangeDetection',
          detectedAt: new Date().toISOString(),
        },
        { idempotencyKey: `CHANGE:${m.id}:${fp}` },
      )

      // Reassessment gate: queue a fresh bias audit for the new version.
      await safeInsert('bias_audits', {
        model_id: m.id,
        status: 'Queued',
        triggered_by: 'mesh-sentinel:ChangeDetection',
      })
    }
  }

  return {
    status: 'succeeded',
    findings,
    summary: `Fingerprinted ${models.length} models — ${baselined} baselined, ${findings.length} changes detected.`,
    metrics: { models: models.length, baselined, changes: findings.length },
  }
}
