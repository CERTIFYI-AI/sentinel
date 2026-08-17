// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// useSetupProgress — resolves the guided-setup checklist (data/setupChecklists)
// against the REAL, org-scoped tables in one batched pass.
//
// It follows the `safeSource` contract of hooks/useModelBacklinks.ts exactly:
// every source is queried independently and TOLERATES failure. A source whose
// query errors (or throws) yields `null` — "cannot tell" — never a thrown hook
// and never a silent 0. Downstream, a `null` renders as "Unknown", so a broken
// connection never nags a correctly-configured org and an empty org is never
// congratulated (CLAUDE.md, First principle #5).
//
// Batching discipline: the checklist spans ~15 tables. Rather than fire ~40
// per-step queries, each table is hit once — a head count where only presence
// matters, or a bounded id/link projection where a step needs an N-of-M
// fraction — and all of them run concurrently in a single Promise.all.

import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { DEMO_MARKER } from '@/services/demoImportService'
import type { SetupContext } from '@/data/setupChecklists'

type Row = Record<string, unknown>

/** Every field null — the honest "cannot tell about anything" context. */
const UNKNOWN_CONTEXT: SetupContext = {
  demoImported: null,
  modelsTotal: null,
  modelsWithOwner: null,
  modelsWithTier: null,
  useCasesTotal: null,
  useCasesLinkedToModel: null,
  risksTotal: null,
  risksLinkedToModel: null,
  incidentsTotal: null,
  controlsTotal: null,
  conformityTotal: null,
  evidenceTotal: null,
  evidenceLinkedToControl: null,
  vendorsTotal: null,
  vendorsLinkedToModel: null,
  criticalVendorsTotal: null,
  criticalVendorsWithReassessment: null,
  aibomTotal: null,
  attestationsTotal: null,
  provenanceTotal: null,
  carbonTotal: null,
  energyTotal: null,
  esgTotal: null,
  tasksTotal: null,
  tasksLinked: null,
}

/** Presence-only count for a table; a failed/errored query yields null. */
async function safeCount(
  build: () => PromiseLike<{ count: number | null; error: unknown }>,
): Promise<number | null> {
  try {
    const { count, error } = await build()
    if (error) return null
    return count ?? 0
  } catch {
    return null
  }
}

/** Bounded row projection; a failed/errored query yields null (not []). */
async function safeRows(
  build: () => PromiseLike<{ data: Row[] | null; error: unknown }>,
): Promise<Row[] | null> {
  try {
    const { data, error } = await build()
    if (error) return null
    return data ?? []
  } catch {
    return null
  }
}

/** Non-empty string test (used for owner / tier presence). */
const has = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0

/**
 * linked_models / linked_model_ids are text[] on some tables and jsonb on
 * others (see vendorService.toIdArray) — normalise both to a string[] and count
 * a row as "linked" when it carries at least one id.
 */
function hasLinkedId(v: unknown): boolean {
  if (Array.isArray(v)) return v.some((x) => typeof x === 'string' && x.length > 0)
  if (typeof v === 'string' && v.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(v)
      return Array.isArray(parsed) && parsed.some((x) => typeof x === 'string' && x.length > 0)
    } catch {
      return false
    }
  }
  return false
}

const CRITICAL_TIERS = new Set(['critical', 'high'])

// A generous ceiling: enough to compute honest fractions without pulling whole
// tables. If an org ever exceeds it the fraction is still a real lower bound of
// the sample, and the presence-based steps stay exact via their own counts.
const ROW_CAP = 2000

async function fetchSetupContext(): Promise<SetupContext> {
  // Not configured (e.g. demo mode) — we genuinely cannot tell. Everything is
  // "Unknown" rather than a misleading all-zero "nothing set up".
  if (!isSupabaseConfigured() || !supabase) return UNKNOWN_CONTEXT
  const sb = supabase

  const [
    demoCount,
    modelRows,
    useCaseRows,
    riskRows,
    incidentsTotal,
    controlsTotal,
    conformityTotal,
    evidenceRows,
    vendorRows,
    aibomTotal,
    attestationsTotal,
    provenanceTotal,
    carbonTotal,
    energyTotal,
    esgTotal,
    taskRows,
  ] = await Promise.all([
    // Demo marker on the head of the id-space (mirrors fetchDemoDataStatus).
    safeCount(() => sb.from('ai_models').select('*', { count: 'exact', head: true }).contains('metadata', DEMO_MARKER)),
    // Models: owner + tier presence needs the actual values, so project them.
    safeRows(() => sb.from('ai_models').select('business_owner,technical_owner,risk_tier').limit(ROW_CAP)),
    // Use cases: link fraction.
    safeRows(() => sb.from('use_cases').select('linked_model_ids').eq('is_deleted', false).limit(ROW_CAP)),
    // Risks: link fraction.
    safeRows(() => sb.from('risks').select('linked_model_ids').eq('is_deleted', false).limit(ROW_CAP)),
    safeCount(() => sb.from('incidents').select('*', { count: 'exact', head: true })),
    safeCount(() => sb.from('controls').select('*', { count: 'exact', head: true }).eq('is_deleted', false)),
    safeCount(() => sb.from('conformity_assessments').select('*', { count: 'exact', head: true })),
    // Evidence: total + control-link fraction.
    safeRows(() => sb.from('evidence').select('linked_controls').eq('is_deleted', false).limit(ROW_CAP)),
    // Vendors: total, model-link fraction, and critical-vendor reassessment.
    safeRows(() => sb.from('vendors').select('linked_models,criticality,reassessment_due_at').limit(ROW_CAP)),
    safeCount(() => sb.from('aibom_records').select('*', { count: 'exact', head: true })),
    // Attestations read through the derived-validity view (attestationService).
    safeCount(() => sb.from('supply_chain_attestation_status').select('*', { count: 'exact', head: true })),
    safeCount(() => sb.from('provenance_nodes').select('*', { count: 'exact', head: true })),
    safeCount(() => sb.from('carbon_records').select('*', { count: 'exact', head: true })),
    safeCount(() => sb.from('energy_metrics').select('*', { count: 'exact', head: true })),
    safeCount(() => sb.from('esg_reports').select('*', { count: 'exact', head: true })),
    // Tasks: total + record-link fraction.
    safeRows(() => sb.from('tasks').select('linked_entity_id').eq('is_deleted', false).limit(ROW_CAP)),
  ])

  // Derive per-source aggregates. A null source stays null in every aggregate
  // it feeds — the "Unknown" signal is never laundered into a 0.
  const modelsTotal = modelRows === null ? null : modelRows.length
  const modelsWithOwner = modelRows === null ? null : modelRows.filter((r) => has(r.business_owner) || has(r.technical_owner)).length
  const modelsWithTier = modelRows === null ? null : modelRows.filter((r) => has(r.risk_tier)).length

  const useCasesTotal = useCaseRows === null ? null : useCaseRows.length
  const useCasesLinkedToModel = useCaseRows === null ? null : useCaseRows.filter((r) => hasLinkedId(r.linked_model_ids)).length

  const risksTotal = riskRows === null ? null : riskRows.length
  const risksLinkedToModel = riskRows === null ? null : riskRows.filter((r) => hasLinkedId(r.linked_model_ids)).length

  const evidenceTotal = evidenceRows === null ? null : evidenceRows.length
  const evidenceLinkedToControl = evidenceRows === null ? null : evidenceRows.filter((r) => hasLinkedId(r.linked_controls)).length

  const vendorsTotal = vendorRows === null ? null : vendorRows.length
  const vendorsLinkedToModel = vendorRows === null ? null : vendorRows.filter((r) => hasLinkedId(r.linked_models)).length
  const criticalVendors = vendorRows === null ? null : vendorRows.filter((r) => CRITICAL_TIERS.has(String(r.criticality ?? '').toLowerCase()))
  const criticalVendorsTotal = criticalVendors === null ? null : criticalVendors.length
  const criticalVendorsWithReassessment = criticalVendors === null ? null : criticalVendors.filter((r) => has(r.reassessment_due_at)).length

  const tasksTotal = taskRows === null ? null : taskRows.length
  const tasksLinked = taskRows === null ? null : taskRows.filter((r) => has(r.linked_entity_id)).length

  return {
    demoImported: demoCount === null ? null : demoCount > 0,
    modelsTotal,
    modelsWithOwner,
    modelsWithTier,
    useCasesTotal,
    useCasesLinkedToModel,
    risksTotal,
    risksLinkedToModel,
    incidentsTotal,
    controlsTotal,
    conformityTotal,
    evidenceTotal,
    evidenceLinkedToControl,
    vendorsTotal,
    vendorsLinkedToModel,
    criticalVendorsTotal,
    criticalVendorsWithReassessment,
    aibomTotal,
    attestationsTotal,
    provenanceTotal,
    carbonTotal,
    energyTotal,
    esgTotal,
    tasksTotal,
    tasksLinked,
  }
}

/**
 * React Query wrapper. `data` is the resolved SetupContext (every field a
 * number/boolean or null). The query itself never rejects on a per-source
 * failure — those degrade to null — so `isError` fires only on a catastrophic
 * failure of the whole pass, which the panel renders with ErrorState + retry.
 */
export function useSetupProgress() {
  return useQuery<SetupContext>({
    queryKey: ['setup-progress'],
    queryFn: fetchSetupContext,
    staleTime: 60_000,
  })
}
