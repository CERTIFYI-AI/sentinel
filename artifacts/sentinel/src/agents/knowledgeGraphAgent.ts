/**
 * KnowledgeGraphAgent — adds/updates nodes & edges in the governance graph.
 * Uses existing tables as the KG store (model→vendor, model→dataset, model→risk, model→framework).
 */
import type { AgentContext, AgentResult } from '../lib/governance/types/events'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export async function knowledgeGraphAgent(ctx: AgentContext): Promise<AgentResult> {
  if (!isSupabaseConfigured()) return { status: 'skipped', error: 'supabase-not-configured' }
  const p = ctx.event.payload as Record<string, unknown>
  const edges: Array<{ from: string; to: string; type: string }> = []

  if (ctx.event.event_type === 'MODEL_REGISTERED') {
    const m = p as { modelId: string; ownerId?: string; vendorId?: string; trainingDataRefs?: string[] }
    if (m.ownerId) edges.push({ from: `model:${m.modelId}`, to: `user:${m.ownerId}`, type: 'owned_by' })
    if (m.vendorId) edges.push({ from: `model:${m.modelId}`, to: `vendor:${m.vendorId}`, type: 'provided_by' })
    for (const d of m.trainingDataRefs ?? []) {
      edges.push({ from: `model:${m.modelId}`, to: `dataset:${d}`, type: 'trained_on' })
    }
  } else if (ctx.event.event_type === 'RISK_CREATED') {
    const r = p as { riskId?: string; modelId?: string }
    if (r.riskId && r.modelId) edges.push({ from: `risk:${r.riskId}`, to: `model:${r.modelId}`, type: 'affects' })
  } else if (ctx.event.event_type === 'VENDOR_LINKED') {
    const v = p as { modelId?: string; vendorId?: string }
    if (v.modelId && v.vendorId) edges.push({ from: `model:${v.modelId}`, to: `vendor:${v.vendorId}`, type: 'provided_by' })
  }

  for (const e of edges) {
    await supabase.from('knowledge_graph').upsert({
      org_id: ctx.orgId,
      from_node: e.from, to_node: e.to, edge_type: e.type,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'org_id,from_node,to_node,edge_type' })
  }

  await ctx.emit('KNOWLEDGE_GRAPH_UPDATED', 'knowledge-graph', {
    edgeCount: edges.length, eventType: ctx.event.event_type,
  })
  ctx.log(`KG +${edges.length} edges`)
  return { status: 'succeeded', output: { edgeCount: edges.length } }
}
