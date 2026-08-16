/**
 * CarbonAgent — stages an ESTIMATED training + inference footprint for a newly
 * registered model.
 *
 * TWO DEFECTS THIS REWRITE CLOSES:
 *  1. it wrote `training_co2_kg` / `inference_co2_kg_per_day` / `annual_co2_kg`
 *     — a third column set that exists nowhere. PostgREST rejected every
 *     insert, `safeInsert` returned null, and the agent returned
 *     `status: 'succeeded'` regardless. It now writes the real columns via
 *     `strictInsert` and reports `failed` when the row does not persist;
 *  2. the numbers were kg while the ledger reports tCO₂e, and nothing marked
 *     them as estimates. They are converted to tonnes and written with
 *     `measurement_method: 'estimated'` plus the methodology string, so the
 *     Carbon Ledger renders them behind an "Estimated" badge rather than
 *     beside measured figures.
 *
 * org_id is deliberately NOT sent: the DB default (`current_user_org_id()`)
 * owns scoping.
 */
import type { AgentContext, AgentResult, ModelRegisteredPayload } from '../lib/governance/types/events'
import { estimateCarbon, strictInsert } from '../lib/governance/agentHelpers'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const KG_PER_TONNE = 1000

/**
 * Platform review trigger — the estimated annual footprint above which a
 * newly registered model is routed to human review. It is a workflow
 * threshold, NOT an organisation's carbon budget (none is stored anywhere),
 * and the emitted event says so in `thresholdSource`.
 */
const REVIEW_THRESHOLD_TCO2E = 50

/**
 * Best-effort lookup of a citable factor for the heuristic. When the catalog
 * carries no matching entry the record still records HOW it was derived
 * (methodology + measurement_method='estimated'); the UI then shows it as an
 * estimate with "No emission factor cited" rather than as a measurement.
 */
async function findTrainingFactorId(): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data, error } = await supabase
    .from('emission_factors')
    .select('id')
    .ilike('factor_unit', '%params%')
    .order('published_year', { ascending: false })
    .limit(1)
  if (error || !data?.length) return null
  return data[0].id as string
}

function currentPeriod(now: Date): { period: string; start: string; end: string } {
  const q = Math.floor(now.getUTCMonth() / 3)
  const startMonth = q * 3
  const start = new Date(Date.UTC(now.getUTCFullYear(), startMonth, 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), startMonth + 3, 0))
  return {
    period: `${now.getUTCFullYear()}-Q${q + 1}`,
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export async function carbonAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as ModelRegisteredPayload
  if (!p?.modelId) return { status: 'skipped' }

  const c = estimateCarbon(p)
  const trainingTco2e = c.trainingCO2Kg / KG_PER_TONNE
  // The heuristic yields a per-day inference figure; the ledger period is a
  // quarter, so it is annualised once and recorded as such in the methodology.
  const inferenceTco2eYear = (c.inferenceCO2KgPerDay * 365) / KG_PER_TONNE
  const totalTco2e = trainingTco2e + inferenceTco2eYear

  const now = new Date()
  const { period, start, end } = currentPeriod(now)
  const factorId = await findTrainingFactorId()

  try {
    await strictInsert('carbon_records', {
      model_id: p.modelId,
      period,
      period_start: start,
      period_end: end,
      training_emissions: trainingTco2e,
      inference_emissions: inferenceTco2eYear,
      total_emissions: totalTco2e,
      net_emissions: totalTco2e,
      // The whole point: this is a modelled estimate, never a measurement.
      measurement_method: 'estimated',
      emission_factor_id: factorId,
      ghg_scope: 'scope_2_location',
      verified: false,
      methodology:
        'Automated registration estimate (ML CO2 Impact heuristic): '
        + `${(c.trainingCO2Kg).toFixed(0)} kgCO2e training from parameter count, `
        + `${c.inferenceCO2KgPerDay.toFixed(2)} kgCO2e/day serving annualised over 365 days. `
        + 'Converted to tCO2e. Replace with metered figures when available.',
      description: `Estimated at registration for ${p.modelName ?? 'model'}.`,
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    ctx.log(`Carbon estimate could NOT be persisted for ${p.modelName}: ${error}`)
    return { status: 'failed', error }
  }

  await ctx.emit('CARBON_ESTIMATED', 'carbon-ledger', {
    modelId: p.modelId,
    period,
    trainingTco2e,
    inferenceTco2e: inferenceTco2eYear,
    totalTco2e,
    basis: 'estimated',
  })

  // Escalation, not a measurement claim: crossing the platform review
  // threshold opens a human review (EU AI Act Art. 14) — it does not assert
  // that an org carbon budget was breached, because no budget is stored.
  if (totalTco2e > REVIEW_THRESHOLD_TCO2E) {
    await ctx.emit('CARBON_BUDGET_EXCEEDED', 'carbon-ledger', {
      modelId: p.modelId,
      period,
      totalTco2e,
      thresholdTco2e: REVIEW_THRESHOLD_TCO2E,
      thresholdSource: 'platform_default_review_trigger',
      basis: 'estimated',
    })
  }

  ctx.log(`Estimated ${totalTco2e.toFixed(2)} tCO2e/yr for ${p.modelName} (${period}, estimated basis)`)
  return { status: 'succeeded', output: { period, trainingTco2e, inferenceTco2eYear, totalTco2e } }
}
