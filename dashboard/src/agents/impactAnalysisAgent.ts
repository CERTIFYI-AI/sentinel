/**
 * ImpactAnalysisAgent — traverses KG for blast radius + ALE.
 */
import type { AgentContext, AgentResult } from '../lib/governance/types/events'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { safeInsert } from '../lib/governance/agentHelpers'

const ALE_PER_SEVERITY: Record<string, number> = { CRITICAL: 5_000_000, HIGH: 1_000_000, MEDIUM: 150_000, LOW: 20_000 }

export async function impactAnalysisAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as { modelId?: string; affectedModels?: string[]; severity?: string; riskId?: string }
  const rootModels = p.affectedModels ?? (p.modelId ? [p.modelId] : [])
  let affected: string[] = [...rootModels]

  if (isSupabaseConfigured() && rootModels.length > 0) {
    // 1-hop breadth: find vendors/datasets then models sharing them
    const { data: edges } = await supabase
      .from('knowledge_graph')
      .select('from_node,to_node,edge_type')
      .eq('org_id', ctx.orgId)
      .in('from_node', rootModels.map(m => `model:${m}`))
    const neighbors = (edges ?? []).map((e: { to_node: string }) => e.to_node)
    const { data: backEdges } = await supabase
      .from('knowledge_graph')
      .select('from_node,to_node,edge_type')
      .eq('org_id', ctx.orgId)
      .in('to_node', neighbors)
    for (const be of backEdges ?? []) {
      if (be.from_node.startsWith('model:')) affected.push(be.from_node.slice(6))
    }
    affected = Array.from(new Set(affected))
  }

  const severity = (p.severity as string) ?? 'MEDIUM'
  const financialExposure = ALE_PER_SEVERITY[severity] ?? 100_000

  await safeInsert('ai_impact_assessments', {
    org_id: ctx.orgId,
    risk_id: p.riskId,
    affected_models: affected,
    financial_exposure_usd: financialExposure * Math.max(1, affected.length),
    regulatory_impact: ['EU_AI_ACT','GDPR','ISO_42001','NIST_AI_RMF'],
    assessed_at: new Date().toISOString(),
    methodology: 'KG BFS + ALE',
  })

  await ctx.emit('IMPACT_ASSESSED', 'risk-register', {
    riskId: p.riskId, affectedModels: affected,
    financialExposure: financialExposure * Math.max(1, affected.length),
    regulatoryImpact: ['EU_AI_ACT','GDPR','ISO_42001','NIST_AI_RMF'],
  })
  ctx.log(`Blast radius ${affected.length} models, ALE $${financialExposure * Math.max(1, affected.length)}`)
  return { status: 'succeeded', output: { affectedCount: affected.length, financialExposure } }
}
