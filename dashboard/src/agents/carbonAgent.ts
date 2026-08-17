/**
 * CarbonAgent — stages an ESTIMATED training + inference footprint for a newly
 * registered model.
 *
 * 2026-08 re-audit fixes, on top of the earlier column/tonnes rewrite:
 *
 *  1. CITED FACTORS ONLY. The agent previously multiplied by bare constants
 *     (320 kg/B-params, 0.00085 kg/inference) while its factor lookup
 *     (`ILIKE '%params%'`) matched no seeded row — every record it wrote cited
 *     nothing. It now looks up `emission_factors` by factor_ref
 *     ('EF-TRAIN-PARAMS' / 'EF-INFER-REQ'), does the arithmetic with the
 *     catalog's stored factor_value, and writes emission_factor_id on the
 *     record. If the factor rows are absent it FAILS instead of persisting an
 *     uncitable estimate.
 *  2. NO INVENTED INPUTS. A model with no recorded parameter count gets no
 *     training estimate (previously a 7B default), and no expectedRequestsPerDay
 *     means no inference estimate (previously 10k/day). If neither input is
 *     recorded there is nothing to estimate and the agent skips.
 *  3. PERIOD ARITHMETIC. The record covers one quarter, so per-day inference
 *     emissions are scaled to the days actually in that quarter — not
 *     annualised into a quarterly row. And net_emissions stays NULL: no offset
 *     is known at registration, and NULL ≠ 0.
 *
 * org_id is deliberately NOT sent: the DB default (`current_user_org_id()`)
 * owns scoping.
 */
import type { AgentContext, AgentResult, ModelRegisteredPayload } from '../lib/governance/types/events'
import { estimateCarbonFromFactors, strictInsert } from '../lib/governance/agentHelpers'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const KG_PER_TONNE = 1000

/**
 * Platform review trigger — the estimated ANNUALISED footprint above which a
 * newly registered model is routed to human review. It is a workflow
 * threshold, NOT an organisation's carbon budget (none is stored anywhere),
 * and the emitted event says so in `thresholdSource`.
 */
const REVIEW_THRESHOLD_TCO2E = 50

const TRAINING_FACTOR_REF = 'EF-TRAIN-PARAMS'
const INFERENCE_FACTOR_REF = 'EF-INFER-REQ'

interface CatalogFactor { id: string; value: number }

/**
 * Both derivations must be citable before anything is written. Returns null
 * when either factor row is missing from the catalog — the caller then fails
 * rather than writing a figure that cites nothing.
 */
async function fetchFactors(): Promise<{ training: CatalogFactor; inference: CatalogFactor } | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data, error } = await supabase
    .from('emission_factors')
    .select('id, factor_ref, factor_value')
    .in('factor_ref', [TRAINING_FACTOR_REF, INFERENCE_FACTOR_REF])
  if (error || !data) return null
  const byRef = new Map(data.map((f: { id: string; factor_ref: string; factor_value: unknown }) =>
    [f.factor_ref, { id: f.id, value: Number(f.factor_value) }]))
  const training = byRef.get(TRAINING_FACTOR_REF)
  const inference = byRef.get(INFERENCE_FACTOR_REF)
  if (!training || !inference || !Number.isFinite(training.value) || !Number.isFinite(inference.value)) return null
  return { training, inference }
}

function currentPeriod(now: Date): { period: string; start: string; end: string; days: number } {
  const q = Math.floor(now.getUTCMonth() / 3)
  const startMonth = q * 3
  const start = new Date(Date.UTC(now.getUTCFullYear(), startMonth, 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), startMonth + 3, 0))
  return {
    period: `${now.getUTCFullYear()}-Q${q + 1}`,
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    // Inclusive day count of the quarter, for per-day → per-period scaling.
    days: Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1,
  }
}

export async function carbonAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as unknown as ModelRegisteredPayload
  if (!p?.modelId) return { status: 'skipped' }

  // A factor must be citable before a derived figure may be written.
  const factors = await fetchFactors()
  if (!factors) {
    const error = 'emission factor not in catalog'
    ctx.log(`Carbon estimate refused for ${p.modelName ?? p.modelId}: ${error} `
      + `(${TRAINING_FACTOR_REF} / ${INFERENCE_FACTOR_REF})`)
    return { status: 'failed', error }
  }

  // Recorded inputs only — a null component means "not estimated", never a default.
  const c = estimateCarbonFromFactors({
    estimatedParams: p.estimatedParams,
    expectedRequestsPerDay: p.expectedRequestsPerDay,
    trainingKgPerBillionParams: factors.training.value,
    inferenceKgPerRequest: factors.inference.value,
  })

  if (c.trainingCO2Kg === null && c.inferenceCO2KgPerDay === null) {
    ctx.log(`Carbon estimate skipped for ${p.modelName ?? p.modelId}: `
      + 'no recorded parameter count and no expected request volume — nothing to estimate.')
    return { status: 'skipped' }
  }

  const now = new Date()
  const { period, start, end, days } = currentPeriod(now)

  const trainingTco2e = c.trainingCO2Kg === null ? null : c.trainingCO2Kg / KG_PER_TONNE
  // The ledger row covers ONE QUARTER: scale the per-day serving figure to the
  // days in this period instead of writing an annual figure into a quarter.
  const inferenceTco2ePeriod = c.inferenceCO2KgPerDay === null
    ? null
    : (c.inferenceCO2KgPerDay * days) / KG_PER_TONNE
  const totalTco2e = (trainingTco2e ?? 0) + (inferenceTco2ePeriod ?? 0)

  const methodologyParts: string[] = [
    'Automated registration estimate from the emission-factor catalog.',
  ]
  if (trainingTco2e !== null) {
    methodologyParts.push(
      `Training: ${(p.estimatedParams! / 1e9).toFixed(2)}B params × ${factors.training.value} kgCO2e/1B-params `
      + `(${TRAINING_FACTOR_REF}), one-off, attributed to ${period}.`,
    )
  } else {
    methodologyParts.push('Training: not estimated — no recorded parameter count.')
  }
  if (inferenceTco2ePeriod !== null) {
    methodologyParts.push(
      `Inference: ${p.expectedRequestsPerDay!.toLocaleString()} req/day × ${factors.inference.value} kgCO2e/inference `
      + `(${INFERENCE_FACTOR_REF}) × ${days} days in ${period}.`,
    )
  } else {
    methodologyParts.push('Inference: not estimated — no expected request volume recorded.')
  }
  methodologyParts.push('Converted to tCO2e. Replace with metered figures when available.')

  try {
    await strictInsert('carbon_records', {
      model_id: p.modelId,
      period,
      period_start: start,
      period_end: end,
      training_emissions: trainingTco2e,
      inference_emissions: inferenceTco2ePeriod,
      total_emissions: totalTco2e,
      // No offset is known at registration; NULL keeps the ledger honest (≠ 0,
      // and ≠ "net equals gross").
      net_emissions: null,
      // The whole point: this is a modelled estimate, never a measurement.
      measurement_method: 'estimated',
      // Cite the factor the dominant derivation used; both refs are named in
      // the methodology. (The row carries a single factor column.)
      emission_factor_id: trainingTco2e !== null ? factors.training.id : factors.inference.id,
      ghg_scope: 'scope_2_location',
      verified: false,
      methodology: methodologyParts.join(' '),
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
    inferenceTco2e: inferenceTco2ePeriod,
    totalTco2e,
    basis: 'estimated',
    factorRefs: [TRAINING_FACTOR_REF, INFERENCE_FACTOR_REF],
  })

  // Escalation, not a measurement claim: crossing the platform review
  // threshold opens a human review (EU AI Act Art. 14) — it does not assert
  // that an org carbon budget was breached, because no budget is stored.
  // Compared on an annualised basis so a short quarter cannot dodge review.
  const annualisedTco2e = (trainingTco2e ?? 0)
    + (c.inferenceCO2KgPerDay === null ? 0 : (c.inferenceCO2KgPerDay * 365) / KG_PER_TONNE)
  if (annualisedTco2e > REVIEW_THRESHOLD_TCO2E) {
    await ctx.emit('CARBON_BUDGET_EXCEEDED', 'carbon-ledger', {
      modelId: p.modelId,
      period,
      totalTco2e: annualisedTco2e,
      thresholdTco2e: REVIEW_THRESHOLD_TCO2E,
      thresholdSource: 'platform_default_review_trigger',
      basis: 'estimated',
    })
  }

  ctx.log(`Estimated ${totalTco2e.toFixed(2)} tCO2e for ${p.modelName} in ${period} (estimated basis, cited factors)`)
  return { status: 'succeeded', output: { period, trainingTco2e, inferenceTco2ePeriod, totalTco2e } }
}
