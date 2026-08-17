// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// useFrameworkCatalog — reads a framework's published catalog
// (`framework_controls`) grouped by domain, and interlinks each catalog control
// to the org `controls` that implement it (forward direction). Its mirror,
// useControlCatalogEntry, resolves the catalog entry an org control satisfies
// (reverse direction), so the catalog ↔ register edge is reachable both ways.
//
// The catalog fetch throws on failure → the caller renders an error state
// (never a fake-empty catalog). The org-controls join is best-effort and
// tolerant (safeSource discipline): if it can't be read, implementation status
// is reported as "unavailable" rather than a fabricated "not implemented".

import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  fetchFrameworkCatalog,
  orgControlInFramework,
  clauseCitesRef,
  type CatalogControl,
  type FrameworkIdentity,
} from '@/services/frameworkCatalogService'

// ── Forward: framework catalog → implementing org controls ───────────────────

/** An org control that implements a catalog control. */
export interface ImplementingControl {
  id: string
  controlRef: string | null
  name: string
  status: string | null
}

export interface CatalogControlWithImpl extends CatalogControl {
  implementedBy: ImplementingControl[]
}

export interface CatalogDomainGroup {
  /** Display label; catalog controls with no domain fall in the '—' bucket. */
  domain: string
  controls: CatalogControlWithImpl[]
}

export interface FrameworkCatalog {
  groups: CatalogDomainGroup[]
  /** Total published controls in the catalog for this framework. */
  catalogCount: number
  /** Catalog controls with at least one implementing org control. */
  implementedCatalogCount: number
  /** False when the org `controls` register could not be read (status unknown). */
  orgControlsAvailable: boolean
}

interface OrgControlRow {
  id: string
  control_id: string | null
  control_ref: string | null
  name: string | null
  title: string | null
  framework: string | null
  framework_id: string | null
  clause: string | null
  clause_ref: string | null
  clause_reference: string | null
  status: string | null
  implementation_status: string | null
}

/** Best-effort read of the org controls register; null signals unavailable. */
async function fetchOrgControlsTolerant(): Promise<OrgControlRow[] | null> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('controls')
      .select(
        'id, control_id, control_ref, name, title, framework, framework_id, clause, clause_ref, clause_reference, status, implementation_status',
      )
    if (error) return null
    return (data ?? []) as OrgControlRow[]
  } catch {
    return null
  }
}

const clauseText = (c: OrgControlRow) =>
  [c.clause_ref, c.clause_reference, c.clause].filter(Boolean).join(' | ')

const DOMAIN_FALLBACK = '—'

async function fetchFrameworkCatalogGraph(fw: FrameworkIdentity): Promise<FrameworkCatalog> {
  // Catalog first — a failure here throws and surfaces as an error state.
  const catalog = await fetchFrameworkCatalog(fw.id)
  const orgControls = await fetchOrgControlsTolerant()
  const available = orgControls !== null
  const inFramework = (orgControls ?? []).filter((c) => orgControlInFramework(c, fw))

  const withImpl: CatalogControlWithImpl[] = catalog.map((cc) => ({
    ...cc,
    implementedBy: !available
      ? []
      : inFramework
          .filter((oc) => clauseCitesRef(clauseText(oc), cc.controlRef))
          .map((oc) => ({
            id: oc.id,
            controlRef: oc.control_ref ?? oc.control_id ?? null,
            name: oc.name ?? oc.title ?? 'Untitled control',
            status: oc.implementation_status ?? oc.status ?? null,
          })),
  }))

  const byDomain = new Map<string, CatalogControlWithImpl[]>()
  for (const cc of withImpl) {
    const key = cc.domain && cc.domain.trim() ? cc.domain.trim() : DOMAIN_FALLBACK
    const list = byDomain.get(key) ?? []
    list.push(cc)
    byDomain.set(key, list)
  }
  const groups: CatalogDomainGroup[] = Array.from(byDomain.entries())
    .map(([domain, controls]) => ({ domain, controls }))
    .sort((a, b) => {
      // The unlabelled bucket sinks to the bottom; the rest sort by name.
      if (a.domain === DOMAIN_FALLBACK) return 1
      if (b.domain === DOMAIN_FALLBACK) return -1
      return a.domain.localeCompare(b.domain)
    })

  return {
    groups,
    catalogCount: catalog.length,
    implementedCatalogCount: available ? withImpl.filter((c) => c.implementedBy.length > 0).length : 0,
    orgControlsAvailable: available,
  }
}

/**
 * Read a framework's catalog (grouped by domain) with each control's
 * implementing org controls resolved. Pass the framework identity (id + name /
 * code for the org-control match); the query is disabled until an id is known.
 */
export function useFrameworkCatalog(fw: FrameworkIdentity | null | undefined) {
  return useQuery<FrameworkCatalog>({
    queryKey: ['framework-catalog', fw?.id],
    queryFn: () => fetchFrameworkCatalogGraph(fw as FrameworkIdentity),
    enabled: !!fw?.id,
    staleTime: 60_000,
  })
}

// ── Reverse: org control → the catalog entry it satisfies ────────────────────

export interface ControlCatalogEntry {
  /** Resolved frameworks.id, used to deep-link to the framework detail. */
  frameworkId: string | null
  frameworkName: string | null
  /** Catalog controls this org control cites (usually 0 or 1). */
  matches: CatalogControl[]
  /** False when a lookup query failed → "Unavailable" (never a fake empty). */
  available: boolean
}

interface OrgControlLite {
  framework?: string | null
  frameworkId?: string | null
  clauseRef?: string | null
}

async function fetchControlCatalogEntry(control: OrgControlLite): Promise<ControlCatalogEntry> {
  const EMPTY: ControlCatalogEntry = { frameworkId: null, frameworkName: null, matches: [], available: true }
  if (!isSupabaseConfigured() || !supabase) return EMPTY

  // Resolve which framework this control belongs to.
  let fw: FrameworkIdentity | null = null
  try {
    const { data, error } = await supabase
      .from('frameworks')
      .select('id, name, code, short_name')
    if (error) return { ...EMPTY, available: false }
    const rows = (data ?? []) as { id: string; name: string | null; code: string | null; short_name: string | null }[]
    const match = rows.find((r) =>
      orgControlInFramework(control, { id: r.id, name: r.name, code: r.code, shortName: r.short_name }),
    )
    if (match) fw = { id: match.id, name: match.name, code: match.code, shortName: match.short_name }
  } catch {
    return { ...EMPTY, available: false }
  }
  if (!fw) return EMPTY

  // Match its clause reference against that framework's catalog.
  try {
    const catalog = await fetchFrameworkCatalog(fw.id)
    const matches = catalog.filter((cc) => clauseCitesRef(control.clauseRef, cc.controlRef))
    return { frameworkId: fw.id, frameworkName: fw.name ?? null, matches, available: true }
  } catch {
    return { frameworkId: fw.id, frameworkName: fw.name ?? null, matches: [], available: false }
  }
}

/**
 * Resolve the catalog entry (and owning framework) an org control satisfies, so
 * a control detail can link back to the published requirement. Tolerant: a
 * failed lookup reports `available: false` ("Unavailable"), never a fake empty.
 */
export function useControlCatalogEntry(control: OrgControlLite | null | undefined) {
  return useQuery<ControlCatalogEntry>({
    queryKey: ['control-catalog-entry', control?.frameworkId ?? null, control?.framework ?? null, control?.clauseRef ?? null],
    queryFn: () => fetchControlCatalogEntry(control as OrgControlLite),
    enabled: !!control && !!(control.framework || control.frameworkId),
    staleTime: 60_000,
  })
}
