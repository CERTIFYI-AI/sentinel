/**
 * AutoPauseAgent — pauses models for Critical/High severity risks.
 */
import type { AgentContext, AgentResult } from '../lib/governance/types/events'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { safeInsert } from '../lib/governance/agentHelpers'

export async function autoPauseAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as { severity?: string; affectedModels?: string[]; modelId?: string; riskId?: string }
  if (p.severity !== 'CRITICAL' && p.severity !== 'HIGH') return { status: 'skipped', error: 'not-critical' }
  const models = p.affectedModels ?? (p.modelId ? [p.modelId] : [])
  if (models.length === 0) return { status: 'skipped', error: 'no-models' }

  if (isSupabaseConfigured()) {
    await supabase.from('ai_models').update({
      status: 'PAUSED',
      paused_reason: `Auto-pause: ${p.severity} risk detected`,
      paused_at: new Date().toISOString(),
    }).in('id', models).eq('org_id', ctx.orgId)
  }
  await safeInsert('workflow_instances', {
    org_id: ctx.orgId,
    template_code: 'WF-T002',
    name: `Auto-Pause for ${p.severity} risk`,
    status: 'RUNNING',
    entity_type: 'risk', entity_id: p.riskId,
    config: { pausedModels: models, reason: p.severity },
  })
  await ctx.emit('MODEL_PAUSED', 'automation-studio', {
    models, reason: p.severity, reviewRequired: true, riskId: p.riskId,
  })
  ctx.log(`Paused ${models.length} models for ${p.severity} risk`)
  return { status: 'succeeded', output: { pausedCount: models.length } }
}
