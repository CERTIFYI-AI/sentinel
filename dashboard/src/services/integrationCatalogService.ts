// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// integrationCatalogService — read access to `public.integration_catalog`, the
// published catalogue of evidence sources (219 products at time of writing).
//
// This is REFERENCE data, not the org's own state: it describes what evidence
// each product carries and how it would be pulled. What the org has actually
// connected lives in `integrations`, joined by `catalog_slug`.
//
// The distinction matters and is surfaced honestly:
//
//   adapter_status = 'available'   an adapter ships; it can be connected and
//                                  it will collect evidence
//                    'beta'        an adapter exists but is not production-ready
//                    'catalogued'  reference only — no adapter, cannot be
//                                  connected, collects nothing
//
// Presenting a product as connectable when no adapter stands behind it would
// be fabricated capability, so `isConnectable` gates every connect affordance
// in the UI on the real status, and the server refuses any slug absent from
// its own registry.
//
// Reads THROW on a real query failure so the page renders an error state
// rather than an empty catalogue that looks like "no integrations exist".

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type AdapterStatus = 'available' | 'beta' | 'catalogued'

/** One published evidence source. */
export interface CatalogEntry {
  slug: string
  name: string
  category: string
  /** What evidence this source carries. */
  whyNeeded: string | null
  /** How evidence is pulled (API / OAuth / SCIM …). */
  evidencePull: string | null
  /** Operator connection walkthrough. */
  connectSteps: string | null
  /** What maps to which evidence entities. */
  evidenceMapping: string | null
  /** Where the provider's own docs live. */
  docsHint: string | null
  /** 1 = adapter shipped, 2 = planned next, 3 = catalogued. */
  tier: number
  adapterStatus: AdapterStatus
}

/**
 * Competing GRC platforms. They are not evidence sources for us, and the
 * seeded catalogue listed some of them as if they were.
 *
 * Migration `20260829000002` removes the rows and clears the pointers. This
 * mirror exists because the two halves deploy independently: a database that
 * has not yet received that migration would keep rendering the competitor
 * text no matter how many times the frontend ships. Rather than let the user
 * wait on deploy order, both ends apply the same rule.
 */
export const COMPETITOR_GRC_SLUGS: readonly string[] = [
  'vanta', 'verifywise', 'drata', 'secureframe', 'sprinto', 'tugboatlogic',
]

const THIRD_PARTY_GRC = /vanta|verifywise|drata|secureframe|sprinto|tugboat/i

/**
 * A `docs_hint` is supposed to point at the PROVIDER's own documentation.
 * 163 seeded rows instead read "Vanta Help Center → Cloud / Infrastructure →
 * search exact product 'AWS'", which is a competitor's help centre advertised
 * inside our product.
 *
 * Dropped, not rewritten: we hold no verified documentation URL for 219
 * products, and inventing 163 of them would be fabricated data — worse than
 * an omitted line. The UI renders `docsHint` only when present, so null
 * simply omits it.
 */
export function sanitizeDocsHint(hint: string | null | undefined): string | null {
  const value = (hint ?? '').trim()
  if (!value) return null
  return THIRD_PARTY_GRC.test(value) ? null : value
}

/**
 * Three seeded `connect_steps` told the operator to enter the credential "in
 * Vanta" — our own connection walkthrough instructing the reader to go and set
 * the integration up in a competitor's product. Worse than the `docs_hint`
 * case, because it is not a reference but an instruction someone may follow.
 *
 * Rewritten rather than dropped: the sentence is OUR walkthrough describing
 * where a credential is entered, and that place is Sentinel. Everything else
 * in the step — which key, which role, which scope — is provider fact from the
 * source workbook and is left untouched.
 *
 * Bounded to literal phrases, deliberately. A blanket name substitution would
 * corrupt any row using the word in another sense, and this mirrors migration
 * `20260830000002` exactly so the two cannot disagree.
 */
const CONNECT_STEP_REWRITES: ReadonlyArray<readonly [string, string]> = [
  ['webhook export to Vanta ingestion queue',
   'webhook export to the Sentinel evidence ingestion queue'],
  [' in Vanta.', ' in Sentinel.'],
]

export function sanitizeConnectSteps(steps: string | null | undefined): string | null {
  const value = (steps ?? '').trim()
  if (!value) return null
  return CONNECT_STEP_REWRITES.reduce(
    (text, [from, to]) => text.split(from).join(to),
    value,
  )
}

const mapRow = (r: Record<string, any>): CatalogEntry => ({
  slug: String(r.slug),
  name: r.name ?? '',
  category: r.category ?? 'other',
  whyNeeded: r.why_needed ?? null,
  evidencePull: r.evidence_pull ?? null,
  connectSteps: sanitizeConnectSteps(r.connect_steps),
  evidenceMapping: r.evidence_mapping ?? null,
  docsHint: sanitizeDocsHint(r.docs_hint),
  tier: typeof r.tier === 'number' ? r.tier : 3,
  adapterStatus: (r.adapter_status as AdapterStatus) ?? 'catalogued',
})

/**
 * The full published catalogue, ordered so connectable products surface first
 * and the rest read alphabetically within their category.
 *
 * No `org_id` filter: this is global reference data readable by any signed-in
 * user (RLS `integration_catalog_read`). Writes are service-role only.
 */
export async function fetchIntegrationCatalog(): Promise<CatalogEntry[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('integration_catalog')
    .select(
      'slug, name, category, why_needed, evidence_pull, connect_steps, evidence_mapping, docs_hint, tier, adapter_status',
    )
    .order('tier', { ascending: true })
    .order('name', { ascending: true })
  if (error) {
    console.warn('[integrationCatalogService] fetch:', error.message)
    throw new Error(error.message)
  }
  return (data ?? [])
    .map(mapRow)
    .filter(e => !COMPETITOR_GRC_SLUGS.includes(e.slug))
}

// ── Pure helpers (no I/O; unit tested) ──────────────────────────────────────

/**
 * Can this product actually be connected today?
 *
 * Only a shipped or beta adapter can. A 'catalogued' entry has no code behind
 * it — offering a Connect button for one would promise collection that cannot
 * happen. The Python worker enforces the same rule server-side (it refuses a
 * slug absent from its registry), so the two agree by construction.
 */
export const isConnectable = (e: Pick<CatalogEntry, 'adapterStatus'>): boolean =>
  e.adapterStatus === 'available' || e.adapterStatus === 'beta'

/** Human label for an adapter status. */
export const adapterStatusLabel = (s: AdapterStatus): string =>
  s === 'available' ? 'Available' : s === 'beta' ? 'Beta' : 'Catalogued'

/**
 * Reconcile the catalogue's `adapter_status` against what the SERVER will
 * actually accept (`GET /v1/integrations/available`).
 *
 * The two are maintained separately — `adapter_status` by a migration, the
 * registry by Python code — and they deploy separately, so they drift. Both
 * directions of drift hurt a user:
 *
 *   * catalogue says `catalogued`, server ships an adapter → the Connect
 *     button is hidden and the product looks permanently unavailable, which
 *     is exactly the "unable to connect AWS" report this reconciliation
 *     exists to answer;
 *   * catalogue says `available`, server has no adapter → Connect is offered
 *     and 400s.
 *
 * The server wins, because it is the thing that accepts or rejects the
 * request. An upgrade lands on `beta`, never `available`: we know an adapter
 * exists, and claiming production maturity on that basis would be inventing a
 * fact the catalogue is supposed to carry.
 *
 * `serverSlugs === null` means the backend could not be reached. That is not
 * evidence about any product, so the catalogue is returned untouched rather
 * than concluding nothing is connectable.
 */
export function reconcileWithServer(
  entries: CatalogEntry[],
  serverSlugs: string[] | null,
): CatalogEntry[] {
  if (!serverSlugs) return entries
  const ships = new Set(serverSlugs)
  return entries.map(e => {
    if (ships.has(e.slug) && e.adapterStatus === 'catalogued') {
      return { ...e, adapterStatus: 'beta' as AdapterStatus }
    }
    if (!ships.has(e.slug) && isConnectable(e)) {
      return { ...e, adapterStatus: 'catalogued' as AdapterStatus }
    }
    return e
  })
}

/** Distinct categories present, in stable alphabetical order. */
export function catalogCategories(entries: CatalogEntry[]): string[] {
  return Array.from(new Set(entries.map(e => e.category))).sort()
}

/** Count of entries per category, for the filter chips. */
export function countByCategory(entries: CatalogEntry[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const e of entries) out[e.category] = (out[e.category] ?? 0) + 1
  return out
}

/** How many of the catalogue can actually be connected right now. */
export const connectableCount = (entries: CatalogEntry[]): number =>
  entries.filter(isConnectable).length

/**
 * Filter by category and free-text query.
 *
 * The search covers the operator-facing prose (`whyNeeded`, `evidencePull`)
 * as well as name and slug, because "which of these gives me MFA evidence?"
 * is the question this page exists to answer.
 */
export function filterCatalog(
  entries: CatalogEntry[],
  opts: { category?: string | null; query?: string } = {},
): CatalogEntry[] {
  const q = (opts.query ?? '').trim().toLowerCase()
  return entries.filter(e => {
    if (opts.category && e.category !== opts.category) return false
    if (!q) return true
    return (
      e.name.toLowerCase().includes(q) ||
      e.slug.toLowerCase().includes(q) ||
      (e.whyNeeded ?? '').toLowerCase().includes(q) ||
      (e.evidencePull ?? '').toLowerCase().includes(q)
    )
  })
}
