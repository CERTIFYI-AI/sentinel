/**
 * ESGAgent — stages a DRAFT disclosure for the current reporting period and
 * attaches the evidence that triggered it.
 *
 * WHAT THIS AGENT NO LONGER DOES:
 *  * it wrote `report_period`, `dimensions` and `source_event_id` — none of
 *    which exist — while omitting the NOT NULL `title` and `period`, so every
 *    insert failed and it returned `status: 'succeeded'` anyway;
 *  * it invented the scores it wrote: `social = 60` and `governance = 55` as
 *    bare constants, and `environmental = 100 − annualCO2/1000`, an arbitrary
 *    formula. An ESG score is a judgement a human makes and signs; an agent
 *    inventing one and storing it as a disclosure figure is exactly the
 *    fabrication this cluster was rebuilt to remove.
 *
 * What it does instead: ensures a draft disclosure exists for the period,
 * cites the model and the carbon record behind the trigger, and leaves the
 * dimension scores NULL for a human to complete. NULL renders as an em-dash;
 * the report cannot be published without going through the approval
 * transition, which records a real approver.
 */
import type { AgentContext, AgentResult } from '../lib/governance/types/events'
import { strictInsert } from '../lib/governance/agentHelpers'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

function currentPeriod(now: Date): { period: string; start: string; end: string } {
  const q = Math.floor(now.getUTCMonth() / 3)
  const startMonth = q * 3
  return {
    period: `${now.getUTCFullYear()}-Q${q + 1}`,
    start: new Date(Date.UTC(now.getUTCFullYear(), startMonth, 1)).toISOString().slice(0, 10),
    end: new Date(Date.UTC(now.getUTCFullYear(), startMonth + 3, 0)).toISOString().slice(0, 10),
  }
}

/** The period's existing draft, if one is already staged. */
async function findDraft(period: string): Promise<{ id: string; model_ids: string[] } | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data, error } = await supabase
    .from('esg_reports')
    .select('id,model_ids')
    .eq('period', period)
    .eq('status', 'draft')
    .limit(1)
  if (error || !data?.length) return null
  return data[0] as { id: string; model_ids: string[] }
}

export async function esgAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as Record<string, unknown>
  const modelId = typeof p.modelId === 'string' ? p.modelId : null
  const { period, start, end } = currentPeriod(new Date())

  const trigger = ctx.event.event_type === 'CARBON_ESTIMATED'
    ? 'a carbon estimate'
    : `a ${String(p.source ?? 'governance')} signal`

  try {
    const existing = await findDraft(period)

    if (existing) {
      if (!supabase) return { status: 'skipped' }
      // Only ever WIDEN the coverage of the staged draft — never overwrite
      // fields a human may already have filled in.
      const modelIds = Array.isArray(existing.model_ids) ? existing.model_ids : []
      if (!modelId || modelIds.includes(modelId)) {
        return { status: 'succeeded', output: { reportId: existing.id, period, changed: false } }
      }
      const { error } = await supabase
        .from('esg_reports')
        .update({ model_ids: [...modelIds, modelId] })
        .eq('id', existing.id)
      if (error) return { status: 'failed', error: error.message }
      await ctx.emit('ESG_UPDATED', 'esg', { reportId: existing.id, period, modelId, trigger })
      ctx.log(`Linked model to the ${period} draft disclosure (${trigger})`)
      return { status: 'succeeded', output: { reportId: existing.id, period, changed: true } }
    }

    // org_id is filled DB-side by current_user_org_id(); scores stay NULL.
    const created = await strictInsert<{ id: string }>('esg_reports', {
      title: `AI ESG disclosure — ${period} (draft)`,
      period,
      period_start: start,
      period_end: end,
      status: 'draft',
      assurance_status: 'none',
      model_ids: modelId ? [modelId] : [],
      methodology:
        `Draft staged automatically when ${trigger} was recorded. `
        + 'Dimension scores are intentionally empty: they are a human judgement and '
        + 'must be entered and approved before this disclosure can be published.',
    })

    await ctx.emit('ESG_UPDATED', 'esg', { reportId: created.id, period, modelId, trigger })
    ctx.log(`Staged draft ESG disclosure for ${period} (${trigger}); scores left for a human reviewer`)
    return { status: 'succeeded', output: { reportId: created.id, period, changed: true } }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    ctx.log(`ESG draft could NOT be persisted for ${period}: ${error}`)
    return { status: 'failed', error }
  }
}
